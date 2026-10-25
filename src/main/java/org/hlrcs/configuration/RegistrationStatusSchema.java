package org.hlrcs.configuration;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import javax.sql.DataSource;

/** Older installations used an ENUM without NEEDS_SUPPLEMENT. Preserve all rows. */
@Configuration
public class RegistrationStatusSchema {
    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    ApplicationRunner upgradeRegistrationStatus(DataSource source) {
        return args -> {
            try (var connection=source.getConnection()) {
                if (!connection.getMetaData().getDatabaseProductName().equalsIgnoreCase("MySQL")) return;
                try (var query=connection.prepareStatement("SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH FROM information_schema.columns WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='property_registrations' AND COLUMN_NAME='status'");
                     var column=query.executeQuery()) {
                    if (!column.next()) return;
                    String type=column.getString(1);
                    if (!"enum".equalsIgnoreCase(type) && !("varchar".equalsIgnoreCase(type) && column.getLong(2)<50)) return;
                }
                try (var statement=connection.createStatement()) {
                    statement.executeUpdate("ALTER TABLE property_registrations MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'PENDING'");
                }
            }
        };
    }
}
