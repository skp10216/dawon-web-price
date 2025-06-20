import React, { useState, useMemo, useEffect } from "react";
import { TextField, Box } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";

const sampleRows = [
  { id: 1, 모델: "갤럭시폴드", 코드: "GF001", 가격: 1000000 },
  { id: 2, 모델: "갤럭시플립", 코드: "GF002", 가격: 900000 },
  { id: 3, 모델: "아이폰14", 코드: "IP001", 가격: 1200000 },
  
];

const sampleColumns: GridColDef[] = [
  { field: "모델", headerName: "모델", width: 150, type: "string" },
  { field: "코드", headerName: "코드", width: 120, type: "string" },
  { field: "가격", headerName: "가격", width: 120, type: "number" },
];

export default function FastGridDemo() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const h = setTimeout(() => setDebounced(search), 100);
    return () => clearTimeout(h);
  }, [search]);

  const filteredRows = useMemo(() => {
    if (!debounced) return sampleRows;
    return sampleRows.filter(row =>
      row.모델.includes(debounced)
    );
  }, [debounced]);

  return (
    <Box>
      <TextField value={search} onChange={e => setSearch(e.target.value)} />
      <DataGrid
        rows={filteredRows}
        columns={sampleColumns}
        autoHeight
        pageSizeOptions={[10, 20, 50]}
      />
    </Box>
  );
}
