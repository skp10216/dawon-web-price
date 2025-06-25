import React, { useState, useMemo } from "react";
import {
    AppBar, Toolbar, Typography, IconButton, Box, Paper, Stack, Button, Container, Badge, Breadcrumbs,
    Link, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Chip, Alert, alpha, Card, CardContent, Divider
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import NotificationsIcon from "@mui/icons-material/Notifications";
import HomeIcon from "@mui/icons-material/Home";
import TableChartIcon from "@mui/icons-material/TableChart";
import BusinessIcon from "@mui/icons-material/Business";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CategoryIcon from "@mui/icons-material/Category";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import UploadButton from "../components/Upload/UploadButton";
import DataTable from "../components/DataTable/DataTable";
import VersionSelector from "../components/Version/VersionSelector";
import ExcelPreviewDialog from "../components/Upload/ExcelPreviewDialog";
import type { PriceTableRow } from "../components/DataTable/samplePriceTableData";
import { savePriceTableToFirestore } from "../utils/savePriceTable";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ComparePage from "../components/Compare/ComparePage";

const Dashboard: React.FC = () => {
    // 엑셀 임시 데이터
    const [excelTempRows, setExcelTempRows] = useState<PriceTableRow[] | null>(null);
    const [excelTempMeta, setExcelTempMeta] = useState<{
        category: string;
        partner: string;
        region: string;
        versionName: string;
    } | null>(null);

    // 메인 데이터 (Firestore or 임시)
    const [tableRows, setTableRows] = useState<PriceTableRow[] | null>(null);
    const [metaInfo, setMetaInfo] = useState<{
        category: string;
        partner: string;
        region: string;
        versionName: string;
    } | null>(null);



    // 현재 선택된 버전ID ("excel_temp" or firestore 버전id)
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

    const gridRows = useMemo(
        () =>
            selectedVersionId === "excel_temp" && excelTempRows
                ? excelTempRows
                : tableRows ?? [],
        [selectedVersionId, excelTempRows, tableRows]
    );

    const gridMeta = useMemo(
        () =>
            selectedVersionId === "excel_temp" && excelTempMeta
                ? excelTempMeta
                : metaInfo ?? null,
        [selectedVersionId, excelTempMeta, metaInfo]
    );

    // 기타 상태들
    const [previewData, setPreviewData] = useState<Record<string, any>[]>([]);
    const [previewOpen, setPreviewOpen] = useState<boolean>(false);
    const [versionRefreshKey, setVersionRefreshKey] = useState(0);
    const [overrideVersionId, setOverrideVersionId] = useState<string | null>(null);

    const [isTempData, setIsTempData] = useState(false); // 임시데이터 여부 (엑셀 업로드)
    const [isSaved, setIsSaved] = useState(false);
    const [compareOpen, setCompareOpen] = useState(false);

    // 파일명(버전명) 입력 다이얼로그 상태
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [versionName, setVersionName] = useState("");
    const [saveLoading, setSaveLoading] = useState(false);

    // 스낵바(알림)
    const [saveSnackbar, setSaveSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error";
    }>({
        open: false,
        message: "",
        severity: "success"
    });

    // 카테고리 한글 변환 함수
    const getCategoryLabel = (category: string) => {
        const categoryMap: Record<string, string> = {
            "galaxyfold": "갤럭시 폴드/플립",
            "galaxy": "갤럭시",
            "apple": "애플",
            "ipad": "아이패드"
        };
        return categoryMap[category] || category;
    };

    // 지역 한글 변환 함수
    const getRegionLabel = (region: string) => {
        const regionMap: Record<string, string> = {
            "kr": "국내",
            "global": "국외"
        };
        return regionMap[region] || region;
    };

    function getTodayString() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        return `${yyyy}_${mm}_${dd}`;
    }

    // 엑셀 업로드 파싱 콜백 (UploadButton에서 호출)
    const handleExcelParsed = (data: Record<string, any>[]) => {
        setPreviewData(data);
        setPreviewOpen(true);
        setIsTempData(true);   // ← 임시 데이터 표시 활성화
        setIsSaved(false);
    };

    // 미리보기 다이얼로그에서 적용 클릭 시
    const handlePreviewApply = ({
        category, partner, region, rows
    }: {
        category: string;
        partner: string;
        region: string;
        rows: Record<string, any>[];
    }) => {
        // rows를 PriceTableRow로 변환
        const priceRows: PriceTableRow[] = rows.map((row, idx) => ({
            id: row.id ?? idx + 1,
            모델: row.모델 ?? "",
            코드: row.코드 ?? "",
            A급: Number(row.A급) ?? 0,
            "A-급": Number(row["A-급"]) ?? 0,
            "B+급": Number(row["B+급"]) ?? 0,
            B급: Number(row.B급) ?? 0,
            통단가: Number(row.통단가) ?? 0,
            폐폰: Number(row.폐폰) ?? 0,
            서브LCD: row.서브LCD !== undefined ? Number(row.서브LCD) : null,
            액정볼록: row.액정볼록 !== undefined ? Number(row.액정볼록) : null,
            LCD점멍_미파손: row.LCD점멍_미파손 !== undefined ? Number(row.LCD점멍_미파손) : null,
            내부LCD: row.내부LCD !== undefined ? Number(row.내부LCD) : null,
            검불차감: row.검불차감 !== undefined ? Number(row.검불차감) : null,
            내_외부LCD: row.내_외부LCD !== undefined ? Number(row.내_외부LCD) : null,
            카메라: row.카메라 !== undefined ? Number(row.카메라) : null,
            카메라차감: row.카메라차감 !== undefined ? Number(row.카메라차감) : null,
            내부잔상차감_중: row.내부잔상차감_중 !== undefined ? Number(row.내부잔상차감_중) : null,
            내부잔상차감_강: row.내부잔상차감_강 !== undefined ? Number(row.내부잔상차감_강) : null,
            내부잔상차감_대: row.내부잔상차감_대 !== undefined ? Number(row.내부잔상차감_대) : null,
            서브잔상차감_중: row.서브잔상차감_중 !== undefined ? Number(row.서브잔상차감_중) : null,
            서브잔상차감_강: row.서브잔상차감_강 !== undefined ? Number(row.서브잔상차감_강) : null,
            서브잔상차감_대: row.서브잔상차감_대 !== undefined ? Number(row.서브잔상차감_대) : null,
        }));

        // 임시 데이터 저장 및 선택 값 전환
        setExcelTempRows(priceRows);
        setExcelTempMeta({ category, partner, region, versionName });
        setSelectedVersionId("excel_temp");
        setIsTempData(true);
        setIsSaved(false);
        setPreviewOpen(false);
        setOverrideVersionId("excel_temp");
    };

    // 파일명(버전명) 입력 후 저장 실행
    const handleSaveToServer = async () => {
        // "임시데이터" 상태이면 임시데이터 사용, 아니면 tableRows/metaInfo 사용
        const saveRows = selectedVersionId === "excel_temp" && excelTempRows ? excelTempRows : tableRows;
        const saveMeta = selectedVersionId === "excel_temp" && excelTempMeta ? excelTempMeta : metaInfo;

        if (!saveRows || saveRows.length === 0 || !saveMeta) {
            setSaveSnackbar({
                open: true,
                message: "저장할 데이터가 없습니다.",
                severity: "error"
            });
            return;
        }
        setSaveLoading(true);
        try {
            const newVersionId = await savePriceTableToFirestore({
                ...saveMeta,
                versionName: versionName,
                data: saveRows,
            });
            setSaveSnackbar({
                open: true,
                message: "단가표가 성공적으로 저장되었습니다!",
                severity: "success"
            });
            setIsTempData(false);
            setExcelTempRows(null);
            setExcelTempMeta(null);
            setIsSaved(true);
            setSaveDialogOpen(false);
            setVersionRefreshKey(prev => prev + 1);
            setSelectedVersionId(newVersionId); // 새로운 버전으로 자동 선택
            setOverrideVersionId(newVersionId); // 호환성
        } catch (e) {
            setSaveSnackbar({
                open: true,
                message: "저장에 실패했습니다. 네트워크/서버를 확인하세요.",
                severity: "error"
            });
        } finally {
            setSaveLoading(false);
        }
    };

    // "서버로 저장" 버튼 클릭 → 파일명(버전명) 입력 다이얼로그 열기
    const handleOpenSaveDialog = () => {
        const meta = selectedVersionId === "excel_temp" && excelTempMeta ? excelTempMeta : metaInfo;
        const todayStr = getTodayString();
        let defaultVersionName = "";
        if (meta) {
            defaultVersionName = `${meta.category}_${meta.partner}_${meta.region}_(${todayStr})`;
        }
        setVersionName(defaultVersionName);
        setSaveDialogOpen(true);
    };

    // ===== VersionSelector와 Table 동기화 =====
    // VersionSelector에서 버전 선택 시 데이터 처리
    const handleVersionChange = (rows: PriceTableRow[], meta: any) => {
        setTableRows(rows);
        setMetaInfo(meta);
        setIsSaved(false);
    };
    
    return (
        <Box
            sx={{
                bgcolor: "#f8fafc",
                minHeight: "100vh",
                width: "100vw"
            }}
        >
            {/* Modern App Bar */}
            <AppBar
                position="static"
                elevation={0}
                sx={{
                    bgcolor: "#ffffff",
                    color: "#1f2937",
                    borderBottom: "1px solid #e5e7eb",
                    backdropFilter: "blur(8px)"
                }}
            >
                <Toolbar
                    sx={{
                        justifyContent: "space-between",
                        px: { xs: 2, sm: 3, md: 4 },
                        minHeight: { xs: 64, sm: 72 }
                    }}
                >
                    {/* 좌측: 로고 + 브랜드 */}
                    <Stack direction="row" alignItems="center" spacing={3}>
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                                borderRadius: 2,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)"
                            }}
                        >
                            <TableChartIcon sx={{ color: "#ffffff", fontSize: 24 }} />
                        </Box>
                        <Box>
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 700,
                                    letterSpacing: "-0.025em",
                                    fontSize: { xs: "1.1rem", sm: "1.25rem" },
                                    color: "#111827"
                                }}
                            >
                                단가표 관리 시스템
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: "#6b7280",
                                    fontSize: "0.75rem",
                                    fontWeight: 500
                                }}
                            >
                                실시간 데이터 관리 플랫폼
                            </Typography>
                        </Box>
                    </Stack>

                    {/* 우측: 알림 + 설정 + 프로필 */}
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <IconButton
                            sx={{
                                color: "#6b7280",
                                borderRadius: 2,
                                "&:hover": {
                                    bgcolor: "#f3f4f6",
                                    color: "#374151"
                                }
                            }}
                        >
                            <Badge badgeContent={3} color="error">
                                <NotificationsIcon />
                            </Badge>
                        </IconButton>
                        <IconButton
                            sx={{
                                color: "#6b7280",
                                borderRadius: 2,
                                "&:hover": {
                                    bgcolor: "#f3f4f6",
                                    color: "#374151"
                                }
                            }}
                        >
                            <SettingsIcon />
                        </IconButton>
                    </Stack>
                </Toolbar>
            </AppBar>

            <Container
                maxWidth={false}
                disableGutters
                sx={{
                    width: "100vw",
                    px: { xs: 2, sm: 3, md: 4 },
                    py: { xs: 3, md: 4 },
                    minHeight: "calc(100vh - 72px)"
                }}
            >

                {/* 브레드크럼 네비게이션 */}
                <Box sx={{ mb: 3 }}>
                    <Breadcrumbs
                        separator="›"
                        sx={{
                            "& .MuiBreadcrumbs-separator": {
                                color: "#9ca3af",
                                fontSize: "1rem"
                            }
                        }}
                    >
                        <Link
                            color="inherit"
                            href="#"
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                color: "#6b7280",
                                textDecoration: "none",
                                fontSize: "0.875rem",
                                fontWeight: 500,
                                "&:hover": { color: "#374151" }
                            }}
                        >
                            <HomeIcon sx={{ mr: 0.5, fontSize: 16 }} />
                            홈
                        </Link>
                        <Typography
                            color="text.primary"
                            sx={{
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                color: "#111827"
                            }}
                        >
                            단가표 관리
                        </Typography>
                    </Breadcrumbs>
                </Box>

                {/* 페이지 헤더 */}
                <Box sx={{ mb: 4 }}>
                    <Stack
                        direction={{ xs: "column", lg: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", lg: "flex-end" }}
                        spacing={3}
                    >
                        {/* 좌측: 제목 + 설명 + 버전 */}
                        <Box>
                            <Typography
                                variant="h4"
                                sx={{
                                    fontWeight: 700,
                                    color: "#111827",
                                    mb: 1,
                                    letterSpacing: "-0.025em"
                                }}
                            >
                                단가표 관리 대시보드
                            </Typography>
                            <Typography
                                variant="body1"
                                sx={{
                                    color: "#6b7280",
                                    mb: 2,
                                    fontWeight: 400
                                }}
                            >
                                실시간 단가 정보 조회 및 관리
                            </Typography>
                            <VersionSelector
                                refreshKey={versionRefreshKey}
                                selectedId={selectedVersionId}
                                overrideSelectedId={overrideVersionId}
                                showExcelTemp={isTempData}
                                onChange={setSelectedVersionId}
                                onVersionChange={handleVersionChange}
                                onVersionIdInit={id => setSelectedVersionId(id)}
                            />
                        </Box>

                        {/* 우측: 액션 버튼들 */}
                        <Stack direction="row" spacing={2} alignItems="center">
                            <UploadButton onDataParsed={handleExcelParsed} />
                            <Button
                                variant="contained"
                                startIcon={<DownloadOutlinedIcon />}
                                sx={{
                                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                    color: "#ffffff",
                                    borderRadius: 2.5,
                                    fontWeight: 600,
                                    fontSize: "0.875rem",
                                    minWidth: 140,
                                    height: 44,
                                    textTransform: "none",
                                    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                                    "&:hover": {
                                        background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                                        boxShadow: "0 6px 16px rgba(16, 185, 129, 0.4)"
                                    }
                                }}
                            >
                                엑셀 다운로드
                            </Button>

                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={() => setCompareOpen(true)}
                                sx={{ ml: 2 }}
                            >
                                버전 비교하기
                            </Button>
                        </Stack>
                    </Stack>
                </Box>

                {/* 업로드된 데이터 메타 정보 표시 */}
                {gridMeta && (
                    <Card
                        elevation={0}
                        sx={{
                            mb: 3,
                            borderRadius: 3,
                            border: "1px solid #e5e7eb",
                            background: "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
                            overflow: "hidden"
                        }}
                    >
                        <CardContent sx={{ p: 3 }}>
                            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                                <Box
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                                        borderRadius: 2,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                >
                                    <CloudUploadIcon sx={{ color: "#ffffff", fontSize: 18 }} />
                                </Box>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontWeight: 600,
                                        color: "#111827"
                                    }}
                                >
                                    업로드된 데이터 정보
                                </Typography>
                            </Stack>

                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                spacing={2}
                                divider={<Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" } }} />}
                            >
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <CategoryIcon sx={{ fontSize: 18, color: "#6b7280" }} />
                                    <Typography variant="body2" sx={{ color: "#6b7280", fontWeight: 500 }}>
                                        종류:
                                    </Typography>
                                    <Chip
                                        label={getCategoryLabel(gridMeta.category)}
                                        size="small"
                                        sx={{
                                            bgcolor: alpha("#3b82f6", 0.1),
                                            color: "#3b82f6",
                                            fontWeight: 600,
                                            fontSize: "0.75rem"
                                        }}
                                    />
                                </Stack>

                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <BusinessIcon sx={{ fontSize: 18, color: "#6b7280" }} />
                                    <Typography variant="body2" sx={{ color: "#6b7280", fontWeight: 500 }}>
                                        거래처:
                                    </Typography>
                                    <Chip
                                        label={gridMeta.partner}
                                        size="small"
                                        sx={{
                                            bgcolor: alpha("#10b981", 0.1),
                                            color: "#10b981",
                                            fontWeight: 600,
                                            fontSize: "0.75rem"
                                        }}
                                    />
                                </Stack>

                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <LocationOnIcon sx={{ fontSize: 18, color: "#6b7280" }} />
                                    <Typography variant="body2" sx={{ color: "#6b7280", fontWeight: 500 }}>
                                        지역:
                                    </Typography>
                                    <Chip
                                        label={getRegionLabel(gridMeta.region)}
                                        size="small"
                                        sx={{
                                            bgcolor: alpha("#f59e0b", 0.1),
                                            color: "#f59e0b",
                                            fontWeight: 600,
                                            fontSize: "0.75rem"
                                        }}
                                    />
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>
                )}

                {/* 업로드 안내 메시지 (데이터가 없을 때) */}
                {!gridMeta && (
                    <Alert
                        severity="info"
                        sx={{
                            mb: 3,
                            borderRadius: 2,
                            border: "1px solid #e0f2fe",
                            bgcolor: "#f0f9ff"
                        }}
                    >
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            엑셀 파일을 업로드하여 단가표 데이터를 관리하세요. 업로드 후 종류, 거래처, 지역, 버전명 정보가 여기에 표시됩니다.
                        </Typography>
                    </Alert>
                )}

                {/* === 상태 배너 (임시/저장여부 안내) === */}
                <Stack spacing={2} sx={{ mb: 2 }}>
                    {isTempData ? (
                        <Alert
                            icon={<CloudUploadIcon fontSize="inherit" />}
                            severity="warning"
                        >
                            <span>
                                <b>임시 데이터</b>입니다. 저장하지 않으면 서버에 반영되지 않습니다.
                                <br />
                                반드시 <b>서버에 저장</b> 버튼을 눌러주세요.
                            </span>
                        </Alert>
                    ) :
                        isSaved ? (
                            <Alert
                                icon={<CheckCircleIcon fontSize="inherit" />}
                                severity="success"
                            >
                                단가표가 <b>정상적으로 서버에 저장</b>되었습니다.
                            </Alert>
                        ) : null}

                </Stack>

                {/* 서버로 저장 버튼 */}
                <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        disabled={
                            // 임시데이터면 excelTempRows, 아니면 tableRows
                            (selectedVersionId === "excel_temp"
                                ? !excelTempRows || excelTempRows.length === 0
                                : !tableRows || tableRows.length === 0
                            ) || saveLoading
                        }
                        onClick={handleOpenSaveDialog}
                        sx={{
                            minWidth: 160,
                            fontWeight: 600,
                            borderRadius: 2.5,
                            background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                            "&:hover": {
                                background: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)",
                                boxShadow: "0 6px 16px rgba(59, 130, 246, 0.4)"
                            }
                        }}
                    >
                        서버로 저장
                    </Button>
                </Stack>

                {!gridMeta && (!gridRows || gridRows.length === 0) ? (
                    <Alert
                        severity="error"
                        sx={{
                            mb: 3,
                            borderRadius: 2,
                            border: "1px solidrgb(254, 224, 224)",
                            bgcolor: "white"
                        }}
                    >
                        <Typography variant="body2" sx={{ fontWeight: 1000 }}>
                            서버에 등록된 단가표 데이터가 없습니다.<br />
                            엑셀 파일을 업로드하여 단가표 데이터를 추가하세요.
                        </Typography>
                    </Alert>
                ) : (
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid #e5e7eb",
                            background: "#ffffff",
                            overflow: "hidden",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
                        }}
                    >
                        <DataTable
                            rows={gridRows}
                            onRowsChange={(rows) => {
                                if (selectedVersionId === "excel_temp") setExcelTempRows(rows);
                                else setTableRows(rows);
                            }}
                        />
                    </Paper>
                )}
            </Container>

            {/* 엑셀 미리보기 다이얼로그 */}
            <ExcelPreviewDialog
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                data={previewData}
                onApply={handlePreviewApply}
            />

            {/* 파일명(버전명) 입력 다이얼로그 */}
            <Dialog
                open={saveDialogOpen}
                onClose={() => setSaveDialogOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        minWidth: 400
                    }
                }}
            >
                <DialogTitle sx={{
                    background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                    color: "white",
                    fontWeight: 600
                }}>
                    저장할 파일명(버전명) 입력
                </DialogTitle>
                <DialogContent sx={{ p: 3, mt: 1 }}>
                    <TextField
                        label="파일명(버전명)"
                        value={versionName}
                        onChange={e => setVersionName(e.target.value)}
                        fullWidth
                        autoFocus
                        placeholder="예: 2024년 6월 11일 폴더 단가표"
                        disabled={saveLoading}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button
                        onClick={() => setSaveDialogOpen(false)}
                        disabled={saveLoading}
                        sx={{ borderRadius: 2 }}
                    >
                        취소
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveToServer}
                        disabled={!versionName.trim() ||
                            saveLoading ||
                            (selectedVersionId === "excel_temp"
                                ? !excelTempRows || excelTempRows.length === 0
                                : !tableRows || tableRows.length === 0
                            )
                        }
                        sx={{
                            borderRadius: 2,
                            background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
                        }}
                    >
                        {saveLoading ? "저장 중..." : "저장"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={compareOpen}
                onClose={() => setCompareOpen(false)}
                maxWidth="xl"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <ComparePage onClose={() => setCompareOpen(false)} />
            </Dialog>

            {/* 서버 저장 결과 알림 */}
            <Snackbar
                open={saveSnackbar.open}
                autoHideDuration={3000}
                onClose={() => setSaveSnackbar({ ...saveSnackbar, open: false })}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <Alert
                    severity={saveSnackbar.severity}
                    onClose={() => setSaveSnackbar({ ...saveSnackbar, open: false })}
                    sx={{ borderRadius: 2 }}
                >
                    {saveSnackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Dashboard;
