package org.hlrcs.configuration;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

/** Additive compatibility upgrade for existing MySQL installations. */
@Configuration
public class DocumentMetadataSchema {
    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    ApplicationRunner upgradeDocumentMetadata(DataSource source) {
        return args -> {
            try (var connection = source.getConnection()) {
                if (!connection.getMetaData().getDatabaseProductName().equalsIgnoreCase("MySQL")) return;
                addMissingColumn(connection, "file_size", "BIGINT NULL");
                addMissingColumn(connection, "uploaded_at", "DATETIME(6) NULL");
            }
        };
    }

    private void addMissingColumn(Connection connection, String name, String type) throws SQLException {
        try (var columns = connection.getMetaData().getColumns(connection.getCatalog(), null, "property_documents", name)) {
            if (columns.next()) return;
        }
        try (var statement = connection.createStatement()) {
            statement.executeUpdate("ALTER TABLE property_documents ADD COLUMN " + name + " " + type);
        } catch (SQLException error) {
            // Another application instance may have completed the same upgrade.
            if (error.getErrorCode() != 1060) throw error;
        }
    }
}
