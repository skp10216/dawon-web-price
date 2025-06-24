import React, { useMemo, useCallback } from "react";
import { 
    Stack, 
    Paper, 
    Typography, 
    Button, 
    Box, 
    useTheme, 
    useMediaQuery,
    Fade,
    Tooltip
} from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import VersionSelector from "../Version/VersionSelector";

interface CompareVersionSelectorProps {
    selectedId1: string | null;
    selectedId2: string | null;
    onSelectId1: (id: string) => void;
    onSelectId2: (id: string) => void;
    onCompare: () => void;
    loading1?: boolean;
    loading2?: boolean;
    disabled?: boolean;
    maxWidth?: number;
    showTooltips?: boolean;
}

const CompareVersionSelector: React.FC<CompareVersionSelectorProps> = ({
    selectedId1,
    selectedId2,
    onSelectId1,
    onSelectId2,
    onCompare,
    loading1 = false,
    loading2 = false,
    disabled = false,
    maxWidth = 1400,
    showTooltips = true,
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    // 비교 버튼 활성화 조건을 메모이제이션
    const isCompareDisabled = useMemo(() => {
        return (
            disabled ||
            !selectedId1 ||
            !selectedId2 ||
            selectedId1 === selectedId2 ||
            loading1 ||
            loading2
        );
    }, [disabled, selectedId1, selectedId2, loading1, loading2]);

    // 같은 버전 선택 여부 확인
    const isSameVersionSelected = useMemo(() => {
        return selectedId1 && selectedId2 && selectedId1 === selectedId2;
    }, [selectedId1, selectedId2]);

    // 콜백 최적화
    const handleCompare = useCallback(() => {
        if (!isCompareDisabled) {
            onCompare();
        }
    }, [isCompareDisabled, onCompare]);

    // 버튼 텍스트 동적 결정
    const getButtonText = () => {
        if (loading1 || loading2) return "로딩 중...";
        if (isSameVersionSelected) return "다른 버전을 선택하세요";
        if (!selectedId1 || !selectedId2) return "버전을 선택하세요";
        return "비교하기";
    };

    // 스타일 상수 분리
    const styles = {
        paper: {
            p: { xs: 2, md: 4 },
            borderRadius: 4,
            display: "flex",
            flexDirection: "column" as const,
            gap: 3,
            alignItems: "center",
            maxWidth,
            width: "100%",
            mx: "auto",
            mb: 2,
            background: "linear-gradient(100deg, #f6fafe 70%, #e5e7eb 100%)",
            boxShadow: "0 4px 36px 0 rgba(59,130,246,0.08)",
            transition: "all 0.3s ease-in-out",
            "&:hover": {
                boxShadow: "0 8px 48px 0 rgba(59,130,246,0.12)",
            },
        },
        title: {
            fontSize: { xs: "1.13rem", md: "1.6rem" },
            fontWeight: 900,
            color: "#2563eb",
            mb: 1,
            textAlign: "center" as const,
        },
        versionBox: {
            minWidth: isMobile ? 200 : 250,
            maxWidth: isMobile ? 280 : 350,
            width: "100%",
            mx: isMobile ? 0 : 1,
        },
        compareIcon: {
            fontSize: isMobile ? 36 : 48,
            color: "#64748b",
            transition: "all 0.3s ease",
            "&:hover": {
                color: "#2563eb",
                transform: "scale(1.1)",
            },
        },
        compareButton: {
            minWidth: 180,
            fontWeight: 900,
            mt: 1,
            background: isCompareDisabled 
                ? "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)"
                : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
            borderRadius: 3,
            fontSize: "1.12rem",
            letterSpacing: 0.03,
            boxShadow: isCompareDisabled 
                ? "none"
                : "0 4px 12px 0 rgba(59,130,246,0.13)",
            transition: "all 0.3s ease",
            "&:hover": {
                background: isCompareDisabled
                    ? "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)"
                    : "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
                transform: isCompareDisabled ? "none" : "translateY(-1px)",
            },
            "&:disabled": {
                color: "rgba(255, 255, 255, 0.6)",
            },
        },
        helperText: {
            fontSize: { xs: "0.96rem", md: "1.06rem" },
            fontWeight: 600,
            color: isSameVersionSelected ? "#ef4444" : "#64748b",
            textAlign: "center" as const,
            transition: "color 0.3s ease",
        },
    };

    return (
        <Paper elevation={3} sx={styles.paper}>
            <Typography variant="h5" sx={styles.title}>
                비교할 두 버전을 선택하세요
            </Typography>
            
            <Stack
                direction={isMobile ? "column" : "row"}
                spacing={isMobile ? 2 : 6}
                alignItems="center"
                justifyContent="center"
                width="100%"
                sx={{ mb: 2 }}
            >
                <Box sx={styles.versionBox}>
                    <VersionSelector
                        label="버전 1"
                        selectedId={selectedId1}
                        onChange={onSelectId1}
                        loading={loading1}
                    />
                </Box>
                
                <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    sx={{ mx: isMobile ? 0 : 3, my: isMobile ? 1 : 0 }}
                >
                    <CompareArrowsIcon sx={styles.compareIcon} />
                </Box>
                
                <Box sx={styles.versionBox}>
                    <VersionSelector
                        label="버전 2"
                        selectedId={selectedId2}
                        onChange={onSelectId2}
                        loading={loading2}
                    />
                </Box>
            </Stack>

            <Fade in={true} timeout={500}>
                <div>
                    {showTooltips ? (
                        <Tooltip 
                            title={
                                isCompareDisabled 
                                    ? "두 개의 서로 다른 버전을 선택해주세요" 
                                    : "선택된 버전들을 비교합니다"
                            }
                            placement="top"
                        >
                            <span>
                                <Button
                                    variant="contained"
                                    size="large"
                                    onClick={handleCompare}
                                    disabled={isCompareDisabled}
                                    sx={styles.compareButton}
                                    aria-label="버전 비교 실행"
                                >
                                    {getButtonText()}
                                </Button>
                            </span>
                        </Tooltip>
                    ) : (
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleCompare}
                            disabled={isCompareDisabled}
                            sx={styles.compareButton}
                            aria-label="버전 비교 실행"
                        >
                            {getButtonText()}
                        </Button>
                    )}
                </div>
            </Fade>

          
        </Paper>
    );
};

export default CompareVersionSelector;