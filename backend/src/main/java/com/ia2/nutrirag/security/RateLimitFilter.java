package com.ia2.nutrirag.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Rate limiter por usuario autenticado (o IP) con ventana deslizante de 1 minuto.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final int maxRequestsPerMinute;
    private final ConcurrentHashMap<String, WindowCounter> buckets = new ConcurrentHashMap<>();

    public RateLimitFilter(@Value("${nutrirag.security.rate-limit-per-minute:60}") int maxRequestsPerMinute) {
        this.maxRequestsPerMinute = maxRequestsPerMinute;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (!request.getRequestURI().startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String key = (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal()))
                ? "usr:" + auth.getName()
                : "ip:" + request.getRemoteAddr();

        long nowMinute = System.currentTimeMillis() / 60000L;
        WindowCounter counter = buckets.compute(key, (k, existing) -> {
            if (existing == null || existing.minuteSlot != nowMinute) {
                return new WindowCounter(nowMinute, new AtomicInteger(1));
            }
            existing.count.incrementAndGet();
            return existing;
        });

        if (counter.count.get() > maxRequestsPerMinute) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("{\"status\":429,\"error\":\"Límite de solicitudes por minuto excedido. Intenta de nuevo en unos segundos.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private record WindowCounter(long minuteSlot, AtomicInteger count) {}
}
