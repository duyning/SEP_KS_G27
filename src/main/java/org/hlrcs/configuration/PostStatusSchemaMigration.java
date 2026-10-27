package org.hlrcs.configuration;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.SQLException;
import java.util.Locale;

/** Upgrades older MySQL databases whose native ENUM lacks NEED_CHANGES. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
@Slf4j
public class PostStatusSchemaMigration implements CommandLineRunner {
    static final String STATUS_COLUMN = "SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS "
            + "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='posts' AND COLUMN_NAME='status'";
    static final String EXPAND_STATUS = "ALTER TABLE posts MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'PENDING' "
            + "COMMENT 'PENDING, NEED_CHANGES, APPROVED, REJECTED'";
    private final DataSource dataSource;

    @Override
    public void run(String... args) throws SQLException {
        try (var connection = dataSource.getConnection()) {
            String product = connection.getMetaData().getDatabaseProductName().toLowerCase(Locale.ROOT);
            if (!product.contains("mysql") && !product.contains("mariadb")) return;
            boolean upgrade;
            try (var query = connection.prepareStatement(STATUS_COLUMN); var result = query.executeQuery()) {
                if (!result.next()) return;
                String type = result.getString("DATA_TYPE");
                upgrade = "enum".equalsIgnoreCase(type) || (("varchar".equalsIgnoreCase(type) || "char".equalsIgnoreCase(type))
                        && result.getLong("CHARACTER_MAXIMUM_LENGTH") < 50);
            }
            if (upgrade) {
                try (var statement = connection.createStatement()) { statement.execute(EXPAND_STATUS); }
                log.info("Upgraded posts.status to VARCHAR(50) for the community revision workflow");
            }
        }
    }
}
