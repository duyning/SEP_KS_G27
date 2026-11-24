package org.hlrcs.configuration;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.*;
import javax.sql.DataSource;
/** Preserve old data while relaxing fields removed from account-role applications. */
@Configuration
public class HostApplicationSchema {
 @Bean ApplicationRunner relaxHostApplicationLegacyFields(DataSource source){return args->{
  try(var c=source.getConnection()){
   if(!"MySQL".equalsIgnoreCase(c.getMetaData().getDatabaseProductName()))return;
   for(String column:new String[]{"target_commune","expected_scale"}){
    try(var columns=c.getMetaData().getColumns(c.getCatalog(),null,"host_applications",column)){
     if(columns.next()&&columns.getInt("NULLABLE")==java.sql.DatabaseMetaData.columnNoNulls)
      try(var statement=c.createStatement()){statement.executeUpdate("ALTER TABLE host_applications MODIFY COLUMN "+column+" VARCHAR(100) NULL");}
    }
   }
  }
 };}
}
