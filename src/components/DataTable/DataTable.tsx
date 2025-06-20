import * as React from "react";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
} from "@mui/x-data-grid";
import {
  Snackbar,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Box,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  Button,
  Stack,
} from "@mui/material";
import { priceTableSampleData, type PriceTableRow } from "./samplePriceTableData";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import GetAppIcon from "@mui/icons-material/GetApp";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import RefreshIcon from "@mui/icons-material/Refresh";
import debounce from "lodash.debounce";

// =====================
// 타입 정의
// =====================
interface DataTableProps {
  rows?: PriceTableRow[];
  onRowsChange?: (rows: PriceTableRow[]) => void;
}

// 검색 캐시를 위한 인터페이스
interface SearchableRow extends PriceTableRow {
  _searchableText: string; // 미리 계산된 검색용 텍스트
  _sortIndex: number; // 미리 계산된 정렬 인덱스
}

// =====================
// 컬럼 정의
// =====================
const columns: GridColDef<PriceTableRow>[] = [
  {
    field: "모델", headerName: "모델", width: 200, editable: false, headerAlign: "left", align: "left",
    renderCell: (params) => <Box sx={{ fontWeight: 600, color: "#1a1a1a" }}>{params.value}</Box>
  },
  {
    field: "코드", headerName: "코드", width: 120, editable: false, headerAlign: "center", align: "center",
    renderCell: (params) =>
      <Chip
        label={params.value}
        size="small"
        sx={{
          bgcolor: "#f8fafc",
          color: "#64748b",
          fontWeight: 500,
          border: "1px solid #e2e8f0"
        }}
      />
  },
  { field: "A급", headerName: "A급", width: 120, editable: true, type: "number", headerAlign: "center", align: "right" },
  { field: "A-급", headerName: "A-급", width: 120, editable: true, type: "number", headerAlign: "center", align: "right" },
  { field: "B+급", headerName: "B+급", width: 120, editable: true, type: "number", headerAlign: "center", align: "right" },
  { field: "B급", headerName: "B급", width: 120, editable: true, type: "number", headerAlign: "center", align: "right" },
  { field: "통단가", headerName: "통단가", width: 130, editable: true, type: "number", headerAlign: "center", align: "right" },
  { field: "폐폰", headerName: "폐폰", width: 100, editable: true, type: "number", headerAlign: "center", align: "right" },
  { field: "서브LCD", headerName: "서브LCD", width: 120, editable: true, type: "number", headerAlign: "center", align: "right" },
  { field: "액정볼록", headerName: "액정 볼록", width: 120, editable: true, type: "number", headerAlign: "center", align: "right" },
  { field: "LCD점멍_미파손", headerName: "LCD점멍(미파손)", width: 150, editable: true, type: "number", headerAlign: "center", align: "right" },
  { field: "내부LCD", headerName: "내부LCD", width: 130, editable: true, type: "number", headerAlign: "center", align: "right" },
  { field: "검불차감", headerName: "검불 차감(내부)", width: 140, editable: true, type: "number", headerAlign: "center", align: "right" },
  { field: "내_외부LCD", headerName: "내/외부LCD", width: 130, editable: true, type: "number", headerAlign: "center", align: "right" },
  { field: "카메라차감", headerName: "카메라 차감", width: 130, editable: true, type: "number", headerAlign: "center", align: "right" },
  { field: "내부잔상차감_중", headerName: "내부잔상차감(중)", width: 140, editable: true, type: "number", headerAlign: "center", align: "right" },
  { field: "내부잔상차감_강", headerName: "내부잔상차감(강)", width: 140, editable: true, type: "number", headerAlign: "center", align: "right" },
  { field: "내부잔상차감_대", headerName: "내부잔상차감(대)", width: 140, editable: true, type: "number", headerAlign: "center", align: "right" },
  { field: "서브잔상차감_중", headerName: "서브잔상차감(중)", width: 140, editable: true, type: "number", headerAlign: "center", align: "right" },
  { field: "서브잔상차감_강", headerName: "서브잔상차감(강)", width: 140, editable: true, type: "number", headerAlign: "center", align: "right" },
  { field: "서브잔상차감_대", headerName: "서브잔상차감(대)", width: 140, editable: true, type: "number", headerAlign: "center", align: "right" },
];

// =====================
// 모델 정렬 기준(샘플)
// =====================
const 모델정렬 = [
  "갤럭시폴드_512GB", "갤럭시폴드2_256GB", "갤럭시폴드3_256GB", "갤럭시폴드3_512GB",
  "갤럭시폴드4_256GB", "갤럭시폴드4_512GB", "갤럭시폴드5_256GB", "갤럭시폴드5_512GB",
  "갤럭시폴드6_256GB", "갤럭시폴드6_512GB", "갤럭시Z플립", "갤럭시Z플립(5G)",
  "갤럭시Z플립3", "갤럭시Z플립4_256GB", "갤럭시Z플립4_512GB", "갤럭시Z플립5_256GB",
  "갤럭시Z플립5_512GB", "갤럭시Z플립6_256GB", "갤럭시Z플립6_512GB",
];

// =====================
// 모델 정렬 맵 (전역으로 이동하여 재생성 방지)
// =====================
const 모델정렬Map = new Map(모델정렬.map((name, idx) => [name, idx]));

// =====================
// 데이터 전처리 함수 (검색 및 정렬 최적화)
// =====================
const preprocessRows = (rows: PriceTableRow[]): SearchableRow[] => {
  return rows.map(row => {
    const sortIndex = 모델정렬Map.get(row.모델) ?? 999999;
    const searchableText = `${row.모델} ${row.코드}`.toLowerCase();
    
    return {
      ...row,
      _searchableText: searchableText,
      _sortIndex: sortIndex
    };
  }).sort((a, b) => {
    if (a._sortIndex === b._sortIndex) {
      return a.모델.localeCompare(b.모델);
    }
    return a._sortIndex - b._sortIndex;
  });
};

// =====================
// 툴바(상단 컨트롤)
// =====================
const CustomToolbar = React.memo(() => {
  return (
    <Box sx={{
      p: 2,
      borderBottom: "1px solid #e2e8f0",
      bgcolor: "#fafbfc",
      display: "flex",
      alignItems: "center",
      gap: 1
    }}>
      <Button size="small" startIcon={<ViewColumnIcon />} sx={{ color: "#475569", fontWeight: 500, textTransform: "none", "&:hover": { bgcolor: "#f1f5f9" } }}>
        컬럼
      </Button>
      <Button size="small" startIcon={<FilterListIcon />} sx={{ color: "#475569", fontWeight: 500, textTransform: "none", "&:hover": { bgcolor: "#f1f5f9" } }}>
        필터
      </Button>
      <Button size="small" startIcon={<GetAppIcon />} sx={{ color: "#475569", fontWeight: 500, textTransform: "none", "&:hover": { bgcolor: "#f1f5f9" } }}>
        내보내기
      </Button>
      <Box sx={{ flexGrow: 1 }} />
      <IconButton size="small" sx={{ color: "#475569", "&:hover": { bgcolor: "#f1f5f9" } }}>
        <RefreshIcon />
      </IconButton>
    </Box>
  );
});

// =====================
// 메인 테이블 컴포넌트 (최적화본)
// =====================
const DataTable: React.FC<DataTableProps> = React.memo(({ rows, onRowsChange }) => {
  // ----- 상태관리 -----
  const [dataRows, setDataRows] = React.useState<PriceTableRow[]>(rows && rows.length > 0 ? rows : [...priceTableSampleData]);
  const [rowSaving, setRowSaving] = React.useState<Record<number, boolean>>({});
  const [rowSaved, setRowSaved] = React.useState<Record<number, boolean>>({});
  const [snackbar, setSnackbar] = React.useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>(
    { open: false, message: "", severity: "success" }
  );
  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 20 });
  
  // 검색어 상태 (단일 상태로 통합)
  const [searchText, setSearchText] = React.useState("");

  // ----- 전처리된 데이터 캐시 (정렬 + 검색용 텍스트 미리 계산) -----
  const preprocessedRows = React.useMemo(() => {
    return preprocessRows(dataRows);
  }, [dataRows]);

  // ----- 상위 row 변화 동기화 -----
  React.useEffect(() => {
    if (rows && rows.length > 0) setDataRows(rows);
  }, [rows]);

  // ----- 저장(디바운스) -----
  const debouncedSave = React.useRef(
    debounce((rowId: number, newRow: PriceTableRow, oldRow: PriceTableRow) => {
      const isChanged = Object.keys(newRow).some(
        (key) => newRow[key as keyof PriceTableRow] !== oldRow[key as keyof PriceTableRow]
      );
      if (!isChanged) return;
      setRowSaving(prev => ({ ...prev, [rowId]: true }));

      setTimeout(() => {
        setDataRows(prev => prev.map(row => row.id === rowId ? { ...newRow } : row));
        setRowSaving(prev => ({ ...prev, [rowId]: false }));
        setRowSaved(prev => ({ ...prev, [rowId]: true }));
        setSnackbar({ open: true, message: `데이터가 저장되었습니다`, severity: "success" });
        setTimeout(() => setRowSaved(prev => ({ ...prev, [rowId]: false })), 1200);
      }, 300);
    }, 400)
  ).current;

  // ----- row 저장 처리 -----
  const processRowUpdate = React.useCallback((newRow: PriceTableRow, oldRow: PriceTableRow) => {
    const updatedRows = dataRows.map(row => row.id === newRow.id ? newRow : row);
    debouncedSave(newRow.id, newRow, oldRow);
    onRowsChange?.(updatedRows);
    return newRow;
  }, [dataRows, debouncedSave, onRowsChange]);

  // ----- 저장상태 인디케이터 -----
  const renderRowSaveIndicator = React.useCallback((params: any) => {
    const rowId: number = params.id;
    if (rowSaving[rowId]) {
      return <CircularProgress size={16} sx={{ color: "#3b82f6" }} />;
    }
    if (rowSaved[rowId]) {
      return <CheckCircleIcon sx={{ color: "#10b981", fontSize: 18 }} />;
    }
    return null;
  }, [rowSaving, rowSaved]);

  // ----- 셀 클래스 -----
  const getCellClassName = React.useCallback(
    (params: any) => params.isEditable && params.hasFocus ? "editing-cell" : "",
    []
  );

  // ----- 컬럼 정의 고정 (재생성 방지) -----
  const columnsWithSaveIndicator: GridColDef<PriceTableRow>[] = React.useMemo(() => [
    ...columns.map((col) => ({
      ...col,
      cellClassName: getCellClassName,
    })),
    {
      field: "__actions",
      headerName: "",
      width: 60,
      sortable: false,
      filterable: false,
      renderCell: renderRowSaveIndicator,
      align: "center",
      headerAlign: "center",
      disableColumnMenu: true,
      disableExport: true,
      description: "저장 상태",
    }
  ], [getCellClassName, renderRowSaveIndicator]);

  // ----- 디바운스된 검색 함수 (검색 로직 최적화) -----
  const debouncedSearch = React.useRef(
    debounce((searchTerm: string, rows: SearchableRow[], callback: (filtered: SearchableRow[]) => void) => {
      if (!searchTerm.trim()) {
        callback(rows);
        return;
      }
      
      const searchLower = searchTerm.toLowerCase();
      const filtered = rows.filter(row => row._searchableText.includes(searchLower));
      callback(filtered);
    }, 150) // 디바운스 시간을 150ms로 설정
  ).current;

  // ----- 필터링된 데이터 상태 -----
  const [filteredRows, setFilteredRows] = React.useState<SearchableRow[]>([]);
  
  // ----- 검색 실행 -----
  React.useEffect(() => {
    debouncedSearch(searchText, preprocessedRows, setFilteredRows);
  }, [searchText, preprocessedRows]);

  // ----- 초기 데이터 설정 -----
  React.useEffect(() => {
    if (!searchText.trim()) {
      setFilteredRows(preprocessedRows);
    }
  }, [preprocessedRows, searchText]);

  // ----- 검색 입력 핸들러 (즉시 반응을 위한 최적화) -----
  const handleSearchChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);
    
    // 빈 검색어일 때는 즉시 전체 데이터 표시
    if (!value.trim()) {
      setFilteredRows(preprocessedRows);
    }
  }, [preprocessedRows]);

  // =====================
  // 렌더링
  // =====================
  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh", p: { xs: 2, sm: 3, md: 4 } }}>
      {/* 검색 & 컨트롤바 */}
      <Card elevation={0} sx={{ mb: 3, border: "1px solid #e2e8f0", borderRadius: 3, bgcolor: "#fff" }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
            <TextField
              placeholder="모델명이나 코드로 검색..."
              variant="outlined"
              size="small"
              value={searchText}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                minWidth: { xs: "100%", sm: 320 },
                "& .MuiOutlinedInput-root": {
                  bgcolor: "#f8fafc",
                  borderRadius: 2,
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#cbd5e1" },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#3b82f6" }
                }
              }}
            />
            <Box sx={{ flexGrow: 1 }} />
            <Stack direction="row" spacing={1}>
              <Chip
                label={`총 ${filteredRows.length}개 항목`}
                sx={{ bgcolor: "#e0f2fe", color: "#0369a1", fontWeight: 600 }}
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* 데이터 그리드 */}
      <Card elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 3, overflow: "hidden", bgcolor: "#fff" }}>
        <Box sx={{ height: "calc(100vh - 300px)", minHeight: 600 }}>
          <DataGrid
            rows={filteredRows}
            columns={columnsWithSaveIndicator}
            editMode="row"
            processRowUpdate={processRowUpdate}
            pagination
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 20, 50, 100]}
            slots={{ toolbar: CustomToolbar }}
            getRowId={(row) => row.id}
            sx={{
              border: "none",
              fontFamily: "'Pretendard', 'Inter', 'Noto Sans KR', sans-serif",
              "& .MuiDataGrid-columnHeaders": {
                bgcolor: "#f8fafc",
                borderBottom: "2px solid #e2e8f0",
                fontWeight: 700,
                fontSize: "0.875rem",
                color: "#374151",
                minHeight: "56px !important",
                "& .MuiDataGrid-columnHeader": { padding: "0 20px" }
              },
              "& .MuiDataGrid-cell": {
                fontSize: "0.875rem",
                lineHeight: 1.5,
                padding: "0 20px",
                borderRight: "1px solid #f1f5f9",
                "&:focus": { outline: "2px solid #3b82f6", outlineOffset: "-2px" }
              },
              "& .MuiDataGrid-row": {
                minHeight: "48px !important",
                borderBottom: "1px solid #f1f5f9",
                "&:hover": { bgcolor: "#f8fafc" },
                "&.Mui-selected": {
                  bgcolor: "#eff6ff",
                  "&:hover": { bgcolor: "#dbeafe" }
                }
              },
              "& .editing-cell": { bgcolor: "#dbeafe !important", border: "2px solid #3b82f6 !important", borderRadius: 1 },
              "& .MuiDataGrid-footerContainer": {
                bgcolor: "#fafbfc",
                borderTop: "2px solid #e2e8f0",
                minHeight: 56,
                "& .MuiTablePagination-root": { color: "#374151", fontSize: "0.875rem" }
              },
              "& .MuiDataGrid-virtualScroller": { bgcolor: "#fff" },
              "& .MuiDataGrid-overlay": { bgcolor: "rgba(255,255,255,0.8)" },
              "& .MuiDataGrid-cell[data-field$='급'], & .MuiDataGrid-cell[data-field*='차감'], & .MuiDataGrid-cell[data-field='통단가'], & .MuiDataGrid-cell[data-field='폐폰'], & .MuiDataGrid-cell[data-field*='LCD'], & .MuiDataGrid-cell[data-field='카메라']": {
                fontFamily: "'Roboto Mono', 'Consolas', monospace",
                fontWeight: 500,
                color: "#1e293b"
              }
            }}
            getRowHeight={() => 48}
            disableRowSelectionOnClick
          />
        </Box>
      </Card>

      {/* 상태/알림 토스트 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{ mt: 2 }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          elevation={6}
          sx={{
            minWidth: 300,
            bgcolor: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            color: "#1f2937",
            fontWeight: 600,
            fontSize: "0.875rem",
            "& .MuiAlert-icon": { fontSize: 22, marginRight: 12 },
            "& .MuiAlert-action": { paddingTop: 0 }
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
});

export default DataTable;