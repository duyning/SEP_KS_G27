package org.hlrcs.configuration;

import org.hlrcs.entity.ServiceCategory;
import org.hlrcs.repository.ServiceCategoryRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.List;

@Configuration
public class ServiceCategoryInitializer {
    @Bean
    CommandLineRunner serviceCategories(ServiceCategoryRepository categories) {
        return args -> {
            for (String name : List.of("Chuyển phòng trọ", "Giặt là sinh viên", "Dọn dẹp & Vệ sinh", "Sửa chữa điện nước, khóa cổng")) {
                if (!categories.existsByName(name)) categories.save(ServiceCategory.builder().name(name).build());
            }
        };
    }
}
