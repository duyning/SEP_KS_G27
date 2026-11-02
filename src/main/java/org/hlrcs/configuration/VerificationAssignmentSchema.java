package org.hlrcs.configuration;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.*;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import javax.sql.DataSource;
import java.sql.*;

/** Same additive startup compatibility mechanism as DocumentMetadataSchema. Never assign legacy rows. */
@Configuration
public class VerificationAssignmentSchema {
    @Bean @Order(Ordered.HIGHEST_PRECEDENCE)
    ApplicationRunner upgradeVerificationAssignment(DataSource source) {
        return args -> {
            try (var connection = source.getConnection()) {
                if (!connection.getMetaData().getDatabaseProductName().equalsIgnoreCase("MySQL")) return;
                add(connection, "assigned_staff_id", "INT NULL");
                add(connection, "assignment_version", "BIGINT NOT NULL DEFAULT 0");
                // The event entity/table and foreign keys are created by the existing Hibernate update mechanism.
            }
        };
    }
    private void add(Connection connection, String column, String definition) throws SQLException {
        try (var columns = connection.getMetaData().getColumns(connection.getCatalog(), null, "property_registrations", column)) {if (columns.next()) return;}
        try (var statement = connection.createStatement()) {statement.executeUpdate("ALTER TABLE property_registrations ADD COLUMN " + column + " " + definition);}
        catch (SQLException error) {if(error.getErrorCode() != 1060) throw error;}
    }
}
