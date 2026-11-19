package com.ia2.nutrirag.controller;

import com.ia2.nutrirag.model.BodyProgressEntry;
import com.ia2.nutrirag.model.DailyMealEntry;
import com.ia2.nutrirag.model.UserAccount;
import com.ia2.nutrirag.repository.BodyProgressEntryRepository;
import com.ia2.nutrirag.repository.DailyMealEntryRepository;
import com.ia2.nutrirag.repository.UserAccountRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class UserDataController {

    private final UserAccountRepository userRepository;
    private final DailyMealEntryRepository mealRepository;
    private final BodyProgressEntryRepository progressRepository;

    @GetMapping("/profile")
    public ResponseEntity<AuthController.UserProfileDto> getProfile(Authentication auth) {
        UserAccount user = userRepository.findById(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado."));
        return ResponseEntity.ok(AuthController.UserProfileDto.from(user));
    }

    @PutMapping("/profile")
    public ResponseEntity<AuthController.UserProfileDto> updateProfile(
            Authentication auth,
            @Valid @RequestBody UpdateProfileRequest req
    ) {
        UserAccount user = userRepository.findById(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado."));
        if (req.name() != null && !req.name().isBlank()) user.setFullName(req.name().trim());
        if (req.country() != null) user.setCountryCode(req.country());
        if (req.budgetTier() != null) user.setBudgetTier(req.budgetTier());
        if (req.sex() != null) user.setSex(req.sex());
        if (req.age() != null) user.setAge(req.age());
        if (req.weightKg() != null) user.setWeightKg(req.weightKg());
        if (req.heightCm() != null) user.setHeightCm(req.heightCm());
        if (req.activityLevel() != null) user.setActivityLevel(req.activityLevel());
        if (req.metabolismType() != null) user.setMetabolismType(req.metabolismType());
        if (req.goal() != null) user.setGoal(req.goal());
        if (req.dailyCalories() != null) user.setDailyCalories(req.dailyCalories());
        if (req.targetCarbs() != null) user.setTargetCarbs(req.targetCarbs());
        if (req.targetProtein() != null) user.setTargetProtein(req.targetProtein());
        if (req.targetFat() != null) user.setTargetFat(req.targetFat());
        if (req.waterGoalMl() != null) user.setWaterGoalMl(req.waterGoalMl());
        userRepository.save(user);
        return ResponseEntity.ok(AuthController.UserProfileDto.from(user));
    }

    @GetMapping("/meals")
    public List<DailyMealEntry> listMeals(Authentication auth) {
        return mealRepository.findByUserIdOrderByCreatedAtDesc(auth.getName());
    }

    @PostMapping("/meals")
    public ResponseEntity<DailyMealEntry> addMeal(
            Authentication auth,
            @Valid @RequestBody CreateMealRequest req
    ) {
        DailyMealEntry entry = DailyMealEntry.builder()
                .id("meal-" + UUID.randomUUID().toString().substring(0, 8))
                .userId(auth.getName())
                .logDate(req.date() != null ? req.date() : LocalDate.now().toString())
                .logTime(req.time())
                .mealType(req.mealType())
                .dishName(req.dishName().trim())
                .totalCalories(req.totalCalories())
                .carbsGrams(req.carbsGrams())
                .proteinGrams(req.proteinGrams())
                .fatGrams(req.fatGrams())
                .fiberGrams(req.fiberGrams() != null ? req.fiberGrams() : 0)
                .sodiumMg(req.sodiumMg() != null ? req.sodiumMg() : 0)
                .potassiumMg(req.potassiumMg() != null ? req.potassiumMg() : 0)
                .vitaminCMg(req.vitaminCMg() != null ? req.vitaminCMg() : 0)
                .qualityScore(req.qualityScore() != null ? req.qualityScore() : 80)
                .nutriGrade(req.nutriGrade() != null ? req.nutriGrade() : "A")
                .glycemicLoad(req.glycemicLoad())
                .nutritionalAdvice(req.nutritionalAdvice())
                .createdAt(LocalDateTime.now())
                .build();
        return ResponseEntity.ok(mealRepository.save(entry));
    }

    @DeleteMapping("/meals/{mealId}")
    public ResponseEntity<Map<String, String>> deleteMeal(Authentication auth, @PathVariable String mealId) {
        mealRepository.findById(mealId).ifPresent(meal -> {
            if (meal.getUserId().equals(auth.getName())) {
                mealRepository.delete(meal);
            }
        });
        return ResponseEntity.ok(Map.of("deleted", mealId));
    }

    @GetMapping("/progress")
    public List<BodyProgressEntry> listProgress(Authentication auth) {
        return progressRepository.findByUserIdOrderByCreatedAtDesc(auth.getName());
    }

    @PostMapping("/progress")
    public ResponseEntity<BodyProgressEntry> addProgress(
            Authentication auth,
            @Valid @RequestBody CreateProgressRequest req
    ) {
        BodyProgressEntry entry = BodyProgressEntry.builder()
                .id("prog-" + UUID.randomUUID().toString().substring(0, 8))
                .userId(auth.getName())
                .logDate(req.date() != null ? req.date() : LocalDate.now().toString())
                .weightKg(req.weightKg())
                .waterMl(req.waterMl() != null ? req.waterMl() : 0)
                .note(req.note())
                .createdAt(LocalDateTime.now())
                .build();
        return ResponseEntity.ok(progressRepository.save(entry));
    }

    public record UpdateProfileRequest(
            String name, String country, String budgetTier, String sex,
            Integer age, Double weightKg, Double heightCm, String activityLevel,
            String metabolismType, String goal, Integer dailyCalories,
            Integer targetCarbs, Integer targetProtein, Integer targetFat, Integer waterGoalMl
    ) {}

    public record CreateMealRequest(
            String date, String time, @NotBlank String mealType, @NotBlank String dishName,
            @Min(0) int totalCalories, @Min(0) int carbsGrams, @Min(0) int proteinGrams, @Min(0) int fatGrams,
            Integer fiberGrams, Integer sodiumMg, Integer potassiumMg, Integer vitaminCMg,
            Integer qualityScore, String nutriGrade, String glycemicLoad, String nutritionalAdvice
    ) {}

    public record CreateProgressRequest(
            String date, Double weightKg, Integer waterMl, String note
    ) {}
}
