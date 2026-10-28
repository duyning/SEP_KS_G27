package org.hlrcs.configuration;

import org.junit.jupiter.api.Test;
import javax.sql.DataSource;
import java.sql.*;

import static org.mockito.Mockito.*;

class PostStatusSchemaMigrationTests {
    private void migrate(String product, String columnType, long length, boolean exists, boolean expectedUpgrade) throws Exception {
        var source = mock(DataSource.class);
        var connection = mock(Connection.class);
        var metadata = mock(DatabaseMetaData.class);
        var query = mock(PreparedStatement.class);
        var result = mock(ResultSet.class);
        var statement = mock(Statement.class);
        when(source.getConnection()).thenReturn(connection);
        when(connection.getMetaData()).thenReturn(metadata);
        when(metadata.getDatabaseProductName()).thenReturn(product);
        when(connection.prepareStatement(PostStatusSchemaMigration.STATUS_COLUMN)).thenReturn(query);
        when(query.executeQuery()).thenReturn(result);
        when(result.next()).thenReturn(exists);
        when(result.getString("DATA_TYPE")).thenReturn(columnType);
        when(result.getLong("CHARACTER_MAXIMUM_LENGTH")).thenReturn(length);
        when(connection.createStatement()).thenReturn(statement);
        new PostStatusSchemaMigration(source).run();
        if (expectedUpgrade) verify(statement).execute(PostStatusSchemaMigration.EXPAND_STATUS);
        else verify(connection, never()).createStatement();
        if (product.equals("H2")) verify(connection, never()).prepareStatement(anyString());
        verify(connection).close();
    }

    @Test
    void expandsLegacyMysqlEnumAndUndersizedColumns() throws Exception {
        migrate("MySQL", "enum", 8, true, true);
        migrate("MariaDB", "enum", 8, true, true);
        migrate("MySQL", "varchar", 8, true, true);
    }

    @Test
    void compliantSchemaIsUnchangedOnEveryStartup() throws Exception {
        migrate("MySQL", "varchar", 50, true, false);
        migrate("MySQL", "varchar", 255, true, false);
    }

    @Test
    void skipsH2AndMissingTable() throws Exception {
        migrate("H2", "enum", 8, true, false);
        migrate("MySQL", "enum", 8, false, false);
    }
}
