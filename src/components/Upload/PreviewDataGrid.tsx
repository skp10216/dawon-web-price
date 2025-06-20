import React, { useMemo, useCallback } from "react";
import { Box } from "@mui/material";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";

interface PreviewDataGridProps {
  rows: any[];
  columns: GridColDef[];
  paginationModel: GridPaginationModel;
  setPaginationModel: (model: GridPaginationModel) => void;
}

const PreviewDataGrid = React.memo(function PreviewDataGrid({
  rows, columns, paginationModel, setPaginationModel
}: PreviewDataGridProps) {
  
  // 1. 스타일 객체를 useMemo로 메모이제이션하여 리렌더링 시 재생성 방지
  const dataGridStyles = useMemo(() => ({
    border: 'none',
    '& .MuiDataGrid-columnHeaders': {
      bgcolor: (theme: any) => theme.palette.grey[100],
      borderBottom: (theme: any) => `2px solid ${theme.palette.divider}`,
      '& .MuiDataGrid-columnHeader': { fontWeight: 600 }
    },
    '& .MuiDataGrid-row:hover': {
      bgcolor: (theme: any) => theme.palette.grey[50]
    },
    '& .MuiDataGrid-cell': {
      borderBottom: (theme: any) => `1px solid ${theme.palette.divider}`
    }
  }), []);

  // 2. pageSizeOptions를 컴포넌트 외부로 이동 또는 useMemo로 메모이제이션
  const pageSizeOptions = useMemo(() => [10, 20, 50], []);

  // 3. 컬럼 정의 최적화 - 컬럼이 자주 변경되지 않는다면 메모이제이션
  const memoizedColumns = useMemo(() => columns, [columns]);

  // 4. pagination 변경 핸들러 최적화
  const handlePaginationChange = useCallback((model: GridPaginationModel) => {
    setPaginationModel(model);
  }, [setPaginationModel]);

  return (
    <Box sx={{ height: 500, width: "100%" }}>
      <DataGrid
        rows={rows}
        columns={memoizedColumns}
        pagination
        paginationModel={paginationModel}
        onPaginationModelChange={handlePaginationChange}
        pageSizeOptions={pageSizeOptions}
        disableRowSelectionOnClick
        // 5. 가상화 최적화 옵션들 추가
        disableVirtualization={false} // 기본값이지만 명시적으로 설정
        rowHeight={52} // 고정 행 높이로 성능 향상
        columnHeaderHeight={56} // 고정 헤더 높이
        hideFooterSelectedRowCount // 불필요한 footer 요소 제거
        // 6. 편집 관련 최적화 (편집 기능이 있다면)
        // processRowUpdate={handleRowUpdate} // 필요시 추가
        // experimentalFeatures={{ newEditingApi: true }} // 새로운 편집 API 사용
        sx={dataGridStyles}
      />
    </Box>
  );
});



// 더 세밀한 메모이제이션이 필요한 경우 사용
// export default React.memo(PreviewDataGrid, arePropsEqual);

export default PreviewDataGrid;