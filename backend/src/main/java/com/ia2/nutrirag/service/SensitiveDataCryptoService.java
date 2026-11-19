package com.ia2.nutrirag.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Servicio de cifrado AES-256-GCM en reposo para notas clínicas, datos sensibles de salud
 * y generación de huellas SHA-256 para logs de auditoría (GDPR / Ley 1581 de Colombia).
 */
@Service
public class SensitiveDataCryptoService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int IV_LENGTH_BYTES = 12;
    private static final int TAG_LENGTH_BITS = 128;

    private final SecretKey secretKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public SensitiveDataCryptoService(
            @Value("${nutrirag.security.encryption-master-key:NutriStudioAes256GcmMasterKey2026!ChangeInProd}")
            String masterKey
    ) {
        this.secretKey = deriveKey(masterKey);
    }

    private SecretKey deriveKey(String masterKey) {
        try {
            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            byte[] keyBytes = sha256.digest(masterKey.getBytes(StandardCharsets.UTF_8));
            return new SecretKeySpec(keyBytes, "AES");
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo derivar la clave AES-256-GCM.", ex);
        }
    }

    public String encrypt(String plaintext) {
        if (plaintext == null) return null;
        try {
            byte[] iv = new byte[IV_LENGTH_BYTES];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            return "v1:"
                    + Base64.getEncoder().encodeToString(iv)
                    + ":"
                    + Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception ex) {
            throw new IllegalStateException("Error cifrando dato clínico sensible.", ex);
        }
    }

    public String decrypt(String payload) {
        if (payload == null || payload.isBlank()) return "";
        if (!payload.startsWith("v1:")) {
            return payload;
        }
        try {
            String[] parts = payload.split(":", 3);
            if (parts.length != 3) {
                throw new IllegalArgumentException("Formato de cifrado AES-GCM inválido.");
            }
            byte[] iv = Base64.getDecoder().decode(parts[1]);
            byte[] encrypted = Base64.getDecoder().decode(parts[2]);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] decoded = cipher.doFinal(encrypted);
            return new String(decoded, StandardCharsets.UTF_8);
        } catch (Exception ex) {
            throw new IllegalStateException("Error descifrando dato clínico sensible.", ex);
        }
    }

    public String sha256Hex(String input) {
        try {
            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            byte[] hash = sha256.digest((input == null ? "" : input).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            return Integer.toHexString(String.valueOf(input).hashCode());
        }
    }
}
