package com.aiplatform.auth.dto;

public record RequestMetadata(String ipAddress, String userAgent, String correlationId, String userId) {

	public RequestMetadata(String ipAddress, String userAgent, String correlationId) {
		this(ipAddress, userAgent, correlationId, "");
	}
}