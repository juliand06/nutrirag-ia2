package com.ia2.nutrirag.controller;

import com.ia2.nutrirag.model.RefreshToken;
import com.ia2.nutrirag.model.UserAccount;
import com.ia2.nutrirag.repository.RefreshTokenRepository;
import com.ia2.nutrirag.repository.UserAccountRepository;
import com.ia2.nutrirag.security.JwtService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserAccountRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @PostMapping("/register")
    @Transactional
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        String email = req.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("Ya existe una cuenta registrada con este correo.");
        }

        UserAccount user = UserAccount.builder()
                .id("usr-" + UUID.randomUUID().toString().substring(0, 8))
                .email(email)
                .fullName(req.name().trim())
                .passwordHash(passwordEncoder.encode(req.password()))
                .authProvider("LOCAL")
                .role("USER")
                .countryCode(req.country() != null ? req.country() : "CO")
                .budgetTier(req.budgetTier() != null ? req.budgetTier() : "equilibrado")
                .sex(req.sex() != null ? req.sex() : "no_especificado")
                .age(req.age() != null ? req.age() : 0)
                .weightKg(req.weightKg() != null ? req.weightKg() : 0.0)
                .heightCm(req.heightCm() != null ? req.heightCm() : 0.0)
                .activityLevel(req.activityLevel() != null ? req.activityLevel() : "moderado")
                .metabolismType(req.metabolismType() != null ? req.metabolismType() : "equilibrado")
                .goal(req.goal() != null ? req.goal() : "mantenimiento")
                .dailyCalories(req.dailyCalories() != null ? req.dailyCalories() : 0)
                .targetCarbs(req.targetCarbs() != null ? req.targetCarbs() : 0)
                .targetProtein(req.targetProtein() != null ? req.targetProtein() : 0)
                .targetFat(req.targetFat() != null ? req.targetFat() : 0)
                .waterGoalMl(req.waterGoalMl() != null ? req.waterGoalMl() : 2000)
                .createdAt(LocalDateTime.now())
                .build();

        userRepository.save(user);
        return ResponseEntity.ok(issueTokenPair(user));
    }

    @PostMapping("/login")
    @Transactional
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        UserAccount user = userRepository.findByEmailIgnoreCase(req.email().trim())
                .orElseThrow(() -> new BadCredentialsException("Correo o contraseña incorrectos."));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Correo o contraseña incorrectos.");
        }
        return ResponseEntity.ok(issueTokenPair(user));
    }

    @PostMapping("/google")
    @Transactional
    public ResponseEntity<AuthResponse> loginWithGoogle(@Valid @RequestBody GoogleAuthRequest req) {
        String email = req.email().trim().toLowerCase();
        UserAccount user = userRepository.findByEmailIgnoreCase(email).orElseGet(() -> {
            UserAccount created = UserAccount.builder()
                    .id("usr-" + UUID.randomUUID().toString().substring(0, 8))
                    .email(email)
                    .fullName(req.name() != null && !req.name().isBlank() ? req.name().trim() : email.split("@")[0])
                    .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .authProvider("GOOGLE")
                    .role("USER")
                    .countryCode("CO")
                    .budgetTier("equilibrado")
                    .activityLevel("moderado")
                    .metabolismType("equilibrado")
                    .goal("mantenimiento")
                    .waterGoalMl(2000)
                    .createdAt(LocalDateTime.now())
                    .build();
            return userRepository.save(created);
        });
        return ResponseEntity.ok(issueTokenPair(user));
    }

    @PostMapping("/refresh")
    @Transactional
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshRequest req) {
        RefreshToken stored = refreshTokenRepository.findByToken(req.refreshToken())
                .orElseThrow(() -> new BadCredentialsException("Refresh token inválido."));

        if (stored.isRevoked() || stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadCredentialsException("Refresh token expirado o revocado.");
        }

        Claims claims = jwtService.parseAndValidate(req.refreshToken());
        if (!"refresh".equals(claims.get("type", String.class))) {
            throw new BadCredentialsException("Tipo de token inválido.");
        }

        UserAccount user = userRepository.findById(stored.getUserId())
                .orElseThrow(() -> new BadCredentialsException("Usuario no encontrado."));

        stored.setRevoked(true);
        refreshTokenRepository.save(stored);
        return ResponseEntity.ok(issueTokenPair(user));
    }

    @PostMapping("/logout")
    @Transactional
    public ResponseEntity<Map<String, String>> logout(@RequestBody(required = false) RefreshRequest req) {
        if (req != null && req.refreshToken() != null && !req.refreshToken().isBlank()) {
            refreshTokenRepository.findByToken(req.refreshToken()).ifPresent(rt -> {
                rt.setRevoked(true);
                refreshTokenRepository.save(rt);
            });
        }
        return ResponseEntity.ok(Map.of("status", "logged_out"));
    }

    private AuthResponse issueTokenPair(UserAccount user) {
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole());
        String refreshTokenValue = jwtService.generateRefreshToken(user.getId());

        RefreshToken entity = RefreshToken.builder()
                .id("rt-" + UUID.randomUUID().toString().substring(0, 8))
                .userId(user.getId())
                .token(refreshTokenValue)
                .expiresAt(LocalDateTime.now().plusSeconds(jwtService.getRefreshExpirationMs() / 1000))
                .revoked(false)
                .createdAt(LocalDateTime.now())
                .build();
        refreshTokenRepository.save(entity);

        return new AuthResponse(
                accessToken,
                refreshTokenValue,
                "Bearer",
                UserProfileDto.from(user)
        );
    }

    public record RegisterRequest(
            @NotBlank @Size(min = 2, max = 120) String name,
            @NotBlank @Email String email,
            @NotBlank @Size(min = 4, max = 120) String password,
            String country,
            String budgetTier,
            String sex,
            Integer age,
            Double weightKg,
            Double heightCm,
            String activityLevel,
            String metabolismType,
            String goal,
            Integer dailyCalories,
            Integer targetCarbs,
            Integer targetProtein,
            Integer targetFat,
            Integer waterGoalMl
    ) {}

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password
    ) {}

    public record GoogleAuthRequest(
            @NotBlank @Email String email,
            String name,
            String idToken
    ) {}

    public record RefreshRequest(@NotBlank String refreshToken) {}

    public record AuthResponse(
            String accessToken,
            String refreshToken,
            String tokenType,
            UserProfileDto user
    ) {}

    public record UserProfileDto(
            String id,
            String name,
            String email,
            String country,
            String budgetTier,
            String sex,
            int age,
            double weightKg,
            double heightCm,
            String activityLevel,
            String metabolismType,
            String goal,
            int dailyCalories,
            int targetCarbs,
            int targetProtein,
            int targetFat,
            int waterGoalMl
    ) {
        public static UserProfileDto from(UserAccount u) {
            return new UserProfileDto(
                    u.getId(), u.getFullName(), u.getEmail(), u.getCountryCode(), u.getBudgetTier(),
                    u.getSex(), u.getAge(), u.getWeightKg(), u.getHeightCm(), u.getActivityLevel(),
                    u.getMetabolismType(), u.getGoal(), u.getDailyCalories(), u.getTargetCarbs(),
                    u.getTargetProtein(), u.getTargetFat(), u.getWaterGoalMl()
            );
        }
    }
}
