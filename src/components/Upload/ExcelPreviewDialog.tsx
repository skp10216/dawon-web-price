import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Stack, MenuItem, Paper, Box, Typography, Divider, alpha
} from "@mui/material";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import PreviewDataGrid from "./PreviewDataGrid"; // 미리보기 데이터 그리드 import

// 옵션 상수 (컴포넌트 외부로 이동하여 재생성 방지)
const CATEGORY_OPTIONS = [
  { value: "galaxyfold", label: "갤럭시 폴드/플립" },
  { value: "galaxy", label: "갤럭시" },
  { value: "apple", label: "애플" },
  { value: "ipad", label: "아이패드" }
];

const REGION_OPTIONS = [
  { value: "kr", label: "국내" },
  { value: "global", label: "국외" }
];

// 스타일 객체들을 컴포넌트 외부로 이동 (재생성 방지)
const dialogPaperStyles = {
  borderRadius: 3,
  bgcolor: 'background.default',
  backgroundImage: 'none',
};

const dialogTitleStyles = {
  background: (theme: any) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  color: 'primary.contrastText',
  py: 3,
  textAlign: 'center',
  fontSize: '1.5rem',
  fontWeight: 600,
  letterSpacing: '0.5px'
};

const dialogContentStyles = {
  p: 4,
  bgcolor: 'grey.50'
};

const paperStyles = {
  p: 3,
  mb: 3,
  borderRadius: 2,
  background: (theme: any) => `linear-gradient(145deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
  border: (theme: any) => `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
};

const typographyStyles = {
  mb: 2,
  color: 'primary.main',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: 1
};

const textFieldStyles = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    '&:hover fieldset': { borderColor: 'primary.main' }
  },
  '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' }
};

const previewPaperStyles = {
  borderRadius: 2,
  overflow: 'hidden',
  border: (theme: any) => `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
};

const previewHeaderStyles = {
  p: 2,
  bgcolor: 'primary.main',
  color: 'primary.contrastText'
};

const dialogActionsStyles = {
  p: 3,
  bgcolor: 'grey.50',
  borderTop: (theme: any) => `1px solid ${alpha(theme.palette.divider, 0.3)}`,
  gap: 2
};

const cancelButtonStyles = {
  borderRadius: 2,
  px: 3,
  py: 1,
  textTransform: 'none',
  fontWeight: 500
};

const applyButtonStyles = {
  borderRadius: 2,
  px: 4,
  py: 1,
  background: (theme: any) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  textTransform: 'none',
  fontWeight: 600,
  boxShadow: (theme: any) => `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
  '&:hover': {
    boxShadow: (theme: any) => `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`
  },
  '&:disabled': {
    background: 'grey.300',
    boxShadow: 'none'
  }
};

// 타입
interface ExcelPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  data: Record<string, any>[];
  onApply: (info: {
    category: string;
    partner: string;
    region: string;
    rows: Record<string, any>[];
  }) => void;
}

const ExcelPreviewDialog: React.FC<ExcelPreviewDialogProps> = ({
  open, onClose, data, onApply
}) => {
  // ======= 입력 상태 =======
  const [category, setCategory] = useState("");
  const [partner, setPartner] = useState("다원트레이드");
  const [region, setRegion] = useState("kr");

  // Dialog 열릴 때마다 상태 초기화
  useEffect(() => {
    if (open) {
      setCategory("");
      setPartner("다원트레이드");
      setRegion("kr");
    }
  }, [open]);

  // ======= DataGrid 컬럼 메모이제이션 =======
  const columns: GridColDef[] = useMemo(() => {
    if (data.length === 0) return [];
    
    return Object.keys(data[0]).map((key) => ({
      field: key,
      headerName: key,
      width: key === "모델" ? 200 : 120,
      type: typeof data[0][key] === "number" ? "number" : "string",
      renderCell: (params) =>
        typeof params.value === "number" && params.value !== null
          ? params.value.toLocaleString("ko-KR")
          : params.value ?? "",
    }));
  }, [data]);

  // id 필드 보장 (메모이제이션)
  const rows = useMemo(() => {
    return data.map((row, idx) => ({ id: idx + 1, ...row }));
  }, [data]);

  // DataGrid 페이지네이션
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0, pageSize: 50
  });

  // 입력값 유효성 체크 (메모이제이션)
  const isValid = useMemo(() => {
    return !!category && !!partner.trim() && !!region;
  }, [category, partner, region]);

  // ======= 이벤트 핸들러 최적화 =======
  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCategory(e.target.value);
  }, []);

  const handlePartnerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPartner(e.target.value);
  }, []);

  const handleRegionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRegion(e.target.value);
  }, []);

  const handleApply = useCallback(() => {
    onApply({ category, partner, region, rows });
  }, [category, partner, region, rows, onApply]);

  // ======= 렌더 옵션 메모이제이션 =======
  const categoryMenuItems = useMemo(() => 
    CATEGORY_OPTIONS.map((opt) => (
      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
    )), []
  );

  const regionMenuItems = useMemo(() => 
    REGION_OPTIONS.map((opt) => (
      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
    )), []
  );

  // ======= 렌더 =======
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{ sx: dialogPaperStyles }}
    >
      {/* 타이틀 */}
      <DialogTitle sx={dialogTitleStyles}>
        📊 엑셀 데이터 미리보기 및 저장 정보 설정
      </DialogTitle>

      <DialogContent sx={dialogContentStyles}>
        {/* ======= 상단 정보 입력폼 ======= */}
        <Paper elevation={3} sx={paperStyles}>
          <Typography variant="h6" sx={typographyStyles}>
            ⚙️ 저장 정보 설정
          </Typography>
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            {/* 종류(카테고리) */}
            <TextField
              select
              label="종류"
              value={category}
              onChange={handleCategoryChange}
              sx={{ ...textFieldStyles, minWidth: 180 }}
              variant="outlined"
            >
              {categoryMenuItems}
            </TextField>
            {/* 거래처 */}
            <TextField
              label="거래처"
              value={partner}
              onChange={handlePartnerChange}
              placeholder="예: 다원트레이드"
              sx={{ ...textFieldStyles, minWidth: 150 }}
              variant="outlined"
            />
            {/* 지역 */}
            <TextField
              select
              label="지역"
              value={region}
              onChange={handleRegionChange}
              sx={{ ...textFieldStyles, minWidth: 120 }}
              variant="outlined"
            >
              {regionMenuItems}
            </TextField>
          </Stack>
        </Paper>

        <Divider sx={{ mb: 3, borderColor: alpha('#000', 0.08) }} />

        {/* ======= 데이터 미리보기 영역 ======= */}
        <Paper elevation={2} sx={previewPaperStyles}>
          <Box sx={previewHeaderStyles}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              📋 데이터 미리보기 ({data.length}개 항목)
            </Typography>
          </Box>
          {/* ✅ 분리된 DataGrid */}
          <PreviewDataGrid
            rows={rows}
            columns={columns}
            paginationModel={paginationModel}
            setPaginationModel={setPaginationModel}
          />
        </Paper>
      </DialogContent>

      {/* ======= 액션 버튼 ======= */}
      <DialogActions sx={dialogActionsStyles}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={cancelButtonStyles}
        >
          취소
        </Button>
        <Button
          variant="contained"
          disabled={!isValid}
          onClick={handleApply}
          sx={applyButtonStyles}
        >
          적용하기
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExcelPreviewDialog;