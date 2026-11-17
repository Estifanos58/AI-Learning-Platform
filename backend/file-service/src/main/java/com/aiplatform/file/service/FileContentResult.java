package com.aiplatform.file.service;

import com.aiplatform.file.domain.FileEntity;

public record FileContentResult(FileEntity file, byte[] content) {
}