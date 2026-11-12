package org.hlrcs.configuration;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.SQLException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
public class ReportStatusSchemaMigration implements CommandLineRunner {
    private final DataSource dataSource;

    @Override
    public void run(String... args) throws SQLException {
        PostStatusSchemaMigration.expandStatus(dataSource,
                PostStatusSchemaMigration.STATUS_COLUMN.replace("TABLE_NAME='posts'", "TABLE_NAME='reports'"),
                "ALTER TABLE reports MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'PENDING' "
                        + "COMMENT 'PENDING, OPEN, RESOLVED, DISMISSED'");
    }
}
