package org.hlrcs.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.RentalContractRequest;
import org.hlrcs.dto.request.RentalContractSignatureRequest;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.service.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.*;

@RestController @RequestMapping("/api/host/rental-contracts") @RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ROOM_HOST','ADMIN')")
public class RentalContractController {
    private final RentalContractService service;private final RentalContractScanService scanner;
    @GetMapping("/templates") public ApiResponse<?> templates(){return ApiResponse.success(Map.of("templates",RentalContractService.templates(),"scanAvailable",scanner.available()));}
    @GetMapping("/rooms/{roomId}") public ApiResponse<?> list(@PathVariable Integer roomId){return ApiResponse.success(service.list(roomId));}
    @PostMapping("/rooms/{roomId}") public ApiResponse<?> create(@PathVariable Integer roomId,@Valid @RequestBody RentalContractRequest request){return ApiResponse.success(service.create(roomId,request));}
    @PostMapping("/{id}/signature")
    public ApiResponse<?> sign(@PathVariable Long id, @Valid @RequestBody RentalContractSignatureRequest request) {
        return ApiResponse.success(service.signAsOwner(id, request));
    }

    @PostMapping("/{id}/signing-link")
    public ApiResponse<?> signingLink(@PathVariable Long id) {
        return ApiResponse.success(service.createSigningLink(id));
    }
    @PostMapping(value="/scan",consumes="multipart/form-data")
    public ApiResponse<?> scan(@RequestParam Integer roomId,@RequestParam boolean consent,@RequestPart("files") List<MultipartFile> files){
        return ApiResponse.success(scanner.scan(roomId,consent,files));
    }
    @PostMapping(value="/scan/inspect",consumes="multipart/form-data")
    public ApiResponse<?> inspectScan(@RequestParam Integer roomId,@RequestParam boolean consent,@RequestPart("files") List<MultipartFile> files){
        return ApiResponse.success(scanner.inspect(roomId,consent,files));
    }
    @PostMapping(value="/scan/page",consumes="multipart/form-data")
    public ApiResponse<?> scanPage(
            @RequestParam Integer roomId,
            @RequestParam boolean consent,
            @RequestParam String pageId,
            @RequestParam int pageNumber,
            @RequestParam int totalPages,
            @RequestParam(defaultValue="0") int fileIndex,
            @RequestParam(defaultValue="1") int sourcePageIndex,
            @RequestPart("file") MultipartFile file){
        return ApiResponse.success(scanner.scanPage(roomId,consent,pageId,pageNumber,totalPages,fileIndex,sourcePageIndex,file));
    }
}
