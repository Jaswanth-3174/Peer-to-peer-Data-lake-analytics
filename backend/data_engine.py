import os
import duckdb
import pandas as pd
from typing import List, Dict, Any, Optional
from pathlib import Path

class DataLakeEngine:
    def __init__(self, data_dir: str = None):
        # Use environment variable if set, otherwise default to "data"
        if data_dir is None:
            data_dir = os.environ.get("DATA_DIR", "data")
        
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.connection = duckdb.connect()
        self._load_csv_files()
    
    def _load_csv_files(self):
        """Load all CSV files from the data directory into DuckDB"""
        for csv_file in self.data_dir.glob("*.csv"):
            table_name = csv_file.stem
            try:
                # Read CSV and create table in DuckDB
                df = pd.read_csv(csv_file)
                self.connection.execute(f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM df")
                print(f"Loaded table '{table_name}' from {csv_file}")
            except Exception as e:
                print(f"Error loading {csv_file}: {e}")
    
    def execute_query(self, query: str) -> Dict[str, Any]:
        """Execute SQL query and return results"""
        try:
            result = self.connection.execute(query).fetchall()
            columns = [desc[0] for desc in self.connection.description]
            
            return {
                "success": True,
                "data": result,
                "columns": columns,
                "row_count": len(result)
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "data": [],
                "columns": [],
                "row_count": 0
            }
    
    def get_tables(self) -> List[str]:
        """Get list of available tables"""
        try:
            result = self.connection.execute("SHOW TABLES").fetchall()
            return [table[0] for table in result]
        except Exception as e:
            print(f"Error getting tables: {e}")
            return []
    
    def get_table_schema(self, table_name: str) -> List[Dict[str, str]]:
        """Get schema information for a table"""
        try:
            result = self.connection.execute(f"DESCRIBE {table_name}").fetchall()
            return [
                {
                    "column_name": row[0],
                    "column_type": row[1],
                    "null": row[2],
                    "key": row[3] if len(row) > 3 else "",
                    "default": row[4] if len(row) > 4 else "",
                    "extra": row[5] if len(row) > 5 else ""
                }
                for row in result
            ]
        except Exception as e:
            print(f"Error getting schema for {table_name}: {e}")
            return []
    
    def add_csv_data(self, file_path: str, table_name: Optional[str] = None):
        """Add new CSV data to the data lake"""
        try:
            if not table_name:
                table_name = Path(file_path).stem
            
            # Copy file to data directory
            dest_path = self.data_dir / f"{table_name}.csv"
            if file_path != str(dest_path):
                import shutil
                shutil.copy2(file_path, dest_path)
            
            # Load into DuckDB
            df = pd.read_csv(dest_path)
            self.connection.execute(f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM df")
            
            return True
        except Exception as e:
            print(f"Error adding CSV data: {e}")
            return False
