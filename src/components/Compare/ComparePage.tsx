import React, { useState } from "react";
import {
    Box, Typography, Divider, IconButton, CircularProgress, Table, TableHead, TableRow,
    TableCell, TableBody, Stack, Chip, Switch, FormControlLabel, Paper, Tooltip, Alert, LinearProgress
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CompareVersionSelector from "./CompareVersionSelector";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import type { PriceTableRow } from "../DataTable/samplePriceTableData";

// ---- 데이터 fetch ----
async function fetchVersionData(versionId: string): Promise<PriceTableRow[]> {
    const docRef = doc(db, "priceTables", versionId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        return data.data ?? [];
    }
    return [];
}

// ---- diff 타입 정의 ----
type DiffType = 'added' | 'deleted' | 'changed' | 'same';

type CellDiff = {
    field: string;
    diffType: DiffType;
    value1?: any;
    value2?: any;
    changePercent?: number;
};

type RowDiff = {
    코드: string;
    모델: string;
    rowType: DiffType;
    cells: CellDiff[];
    originalRow1?: PriceTableRow;
    originalRow2?: PriceTableRow;
};

// ---- diff 분석 ----
function getAdvancedDiff(
    rows1: PriceTableRow[],
    rows2: PriceTableRow[]
): RowDiff[] {
    const map1 = new Map(rows1.map((row) => [row.코드, row]));
    const map2 = new Map(rows2.map((row) => [row.코드, row]));
    const allCodes = Array.from(new Set([...map1.keys(), ...map2.keys()]));
    const IGNORED_FIELDS = ["_searchableText", "_sortIndex"];
    // 순서: 중요 필드 우선, 나머지 오름차순
    const allFields = new Set<string>();
    [...rows1, ...rows2].forEach(row => {
        Object.keys(row).forEach(field => {
            if (!IGNORED_FIELDS.includes(field)) {
                allFields.add(field);
            }
        });
    });
    const fieldOrder = ['모델', '코드', '브랜드', '제품명', '단가', '할인율'];
    const orderedFields = [
        ...fieldOrder.filter(f => allFields.has(f)),
        ...Array.from(allFields).filter(f => !fieldOrder.includes(f)).sort()
    ];

    const result: RowDiff[] = [];

    allCodes.forEach((code) => {
        const r1 = map1.get(code);
        const r2 = map2.get(code);
        let rowType: DiffType = 'same';
        const cells: CellDiff[] = [];
        if (!r1 && r2) {
            rowType = 'added';
            orderedFields.forEach(field => {
                cells.push({
                    field,
                    diffType: 'added',
                    value2: (r2 as any)[field]
                });
            });
        } else if (r1 && !r2) {
            rowType = 'deleted';
            orderedFields.forEach(field => {
                cells.push({
                    field,
                    diffType: 'deleted',
                    value1: (r1 as any)[field]
                });
            });
        } else if (r1 && r2) {
            let hasChanges = false;
            orderedFields.forEach(field => {
                const val1 = (r1 as any)[field];
                const val2 = (r2 as any)[field];
                if (val1 !== val2) {
                    hasChanges = true;
                    let changePercent: number | undefined;
                    if (typeof val1 === 'number' && typeof val2 === 'number' && val1 !== 0) {
                        changePercent = Math.round(((val2 - val1) / val1) * 100);
                    }
                    cells.push({
                        field,
                        diffType: 'changed',
                        value1: val1,
                        value2: val2,
                        changePercent
                    });
                } else {
                    cells.push({
                        field,
                        diffType: 'same',
                        value1: val1,
                        value2: val2
                    });
                }
            });
            rowType = hasChanges ? 'changed' : 'same';
        }
        // 모델명은 첫 번째로 찾은 유효한 값 사용
        const modelName = r1?.모델 || r2?.모델 || '';
        result.push({
            코드: code,
            모델: modelName,
            rowType,
            cells,
            originalRow1: r1,
            originalRow2: r2
        });
    });

    return result.sort((a, b) => a.코드.localeCompare(b.코드));
}

// ---- 스타일 ----
const getRowStyle = (rowType: DiffType) => {
    switch (rowType) {
        case 'added':
            return { backgroundColor: '#f0fdf4', borderLeft: '5px solid #10b981' };
        case 'deleted':
            return { backgroundColor: '#fef2f2', borderLeft: '5px solid #ef4444' };
        case 'changed':
            return { backgroundColor: '#fffbeb', borderLeft: '5px solid #f59e0b' };
        default:
            return { backgroundColor: '#fff' };
    }
};
const getCellStyle = (diffType: DiffType) => {
    if (diffType === 'changed')
        return { backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px', padding: '8px' };
    return {};
};

// ---- 메인 컴포넌트 ----
interface ComparePageProps {
    onClose: () => void;
}
const FILTER_TYPES: { type: DiffType | 'all', label: string; color: string; icon: React.ReactNode }[] = [
    { type: 'all', label: '전체', color: '#334155', icon: <CheckIcon /> },
    { type: 'added', label: '신규', color: '#10b981', icon: <AddIcon /> },
    { type: 'deleted', label: '삭제', color: '#ef4444', icon: <DeleteIcon /> },
    { type: 'changed', label: '변경', color: '#f59e0b', icon: <EditIcon /> },
    { type: 'same', label: '동일', color: '#64748b', icon: <CheckIcon /> },
];
const getDiffTypeColor = (type: DiffType | 'all') =>
    FILTER_TYPES.find(ft => ft.type === type)?.color || '#64748b';

const ComparePage: React.FC<ComparePageProps> = ({ onClose }) => {
    const [selectedId1, setSelectedId1] = useState<string | null>(null);
    const [selectedId2, setSelectedId2] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [diffData, setDiffData] = useState<RowDiff[] | null>(null);
    const [showAllRows, setShowAllRows] = useState(false);
    const [filterType, setFilterType] = useState<DiffType | 'all'>('all');

    React.useEffect(() => { setDiffData(null); }, [selectedId1, selectedId2]);
    const isSameVersion = selectedId1 && selectedId2 && selectedId1 === selectedId2;

    // 비교 실행
    const handleCompare = async () => {
        if (!selectedId1 || !selectedId2 || selectedId1 === selectedId2) return;
        setLoading(true);
        setDiffData(null);
        try {
            const [rows1, rows2] = await Promise.all([
                fetchVersionData(selectedId1),
                fetchVersionData(selectedId2),
            ]);
            setDiffData(getAdvancedDiff(rows1, rows2));
        } finally {
            setLoading(false);
        }
    };

    // 통계
    const stats = React.useMemo(() => {
        if (!diffData) return null;
        const stat: Record<DiffType, number> = { added: 0, deleted: 0, changed: 0, same: 0 };
        diffData.forEach(r => stat[r.rowType]++);
        return stat;
    }, [diffData]);

    // 필터링
    const displayData = React.useMemo(() => {
        if (!diffData) return [];
        if (filterType === 'all') {
            return showAllRows ? diffData : diffData.filter(row => row.rowType !== 'same');
        }
        return diffData.filter(row => row.rowType === filterType);
    }, [diffData, showAllRows, filterType]);

    // 값 렌더링 함수
    const renderCellValue = (cell: CellDiff) => {
        switch (cell.diffType) {
            case 'added':
                return <Box sx={{ color: '#059669', fontWeight: 600 }}>{String(cell.value2 ?? '')}</Box>;
            case 'deleted':
                return <Box sx={{ color: '#dc2626', fontWeight: 600, textDecoration: 'line-through' }}>{String(cell.value1 ?? '')}</Box>;
            case 'changed':
                return (
                    <Box>
                        <Box sx={{ color: '#64748b', fontSize: '0.875rem', textDecoration: 'line-through' }}>{String(cell.value1 ?? '')}</Box>
                        <Box sx={{ color: 'black', fontWeight: 600, fontSize: '0.875rem' }}>
                            {String(cell.value2 ?? '')}
                            {cell.changePercent !== undefined &&
                                <Chip
                                    label={`${cell.changePercent > 0 ? '+' : ''}${cell.changePercent}%`}
                                    size="small"
                                    sx={{
                                        ml: 1,
                                        fontSize: '0.75rem',
                                        height: 20,
                                        backgroundColor: cell.changePercent > 0 ? '#fee2e2' : '#dbeafe',
                                        color: cell.changePercent > 0 ? '#dc2626' : '#2563eb'
                                    }}
                                />}
                        </Box>
                    </Box>
                );
            default:
                return <Box sx={{ color: '#64748b' }}>{String(cell.value1 ?? cell.value2 ?? '')}</Box>;
        }
    };

    // 중복된 모델/코드 칼럼 방지
    const tableFields = React.useMemo(() => {
        if (!diffData || !diffData[0]) return [];
        return diffData[0].cells.map(cell => cell.field).filter((f, i, arr) =>
            (f !== "모델" && f !== "코드") || arr.indexOf(f) === i
        );
    }, [diffData]);

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, position: "relative", minWidth: 340 }}>
            {/* 헤더 */}
            <IconButton
                onClick={onClose}
                sx={{
                    position: "absolute", right: 16, top: 16, zIndex: 10, color: "#64748b",
                    '&:hover': { backgroundColor: '#f1f5f9' }
                }}
            ><CloseIcon fontSize="medium" /></IconButton>
            <Typography variant="h4" fontWeight={800} mb={1} color="#2563eb" sx={{ letterSpacing: '-.5px' }}>
                🔍 버전 비교 분석
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={3}>
                두 버전 간 변경/신규/삭제/동일 항목을 직관적으로 비교합니다.
            </Typography>
            <Divider sx={{ mb: 3 }} />

            {/* 버전 선택 */}
            <CompareVersionSelector
                selectedId1={selectedId1}
                selectedId2={selectedId2}
                onSelectId1={setSelectedId1}
                onSelectId2={setSelectedId2}
                onCompare={handleCompare}
            />
            {isSameVersion && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                    서로 다른 버전을 선택해주세요.
                </Alert>
            )}

            <Divider sx={{ my: 4 }} />

            {/* 로딩 */}
            {loading && (
                <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
                    <CircularProgress sx={{ mb: 2 }} />
                    <Typography>비교 분석 중...</Typography>
                    <LinearProgress sx={{ mt: 2 }} />
                </Paper>
            )}

            {/* 결과 */}
            {!loading && diffData && (
                <>
                    {/* 통계 카드: 클릭 필터 */}
                    <Paper elevation={2} sx={{
                        p: 3, mb: 3, background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)', border: '1px solid #e2e8f0'
                    }}>
                        <Typography variant="h6" fontWeight={700} mb={2} color="#1e293b">
                            📊 변경 요약
                        </Typography>
                        <Stack direction="row" spacing={2} flexWrap="wrap">
                            {FILTER_TYPES.map(stat => (
                                <Paper
                                    key={stat.type}
                                    elevation={filterType === stat.type ? 8 : 1}
                                    onClick={() => setFilterType(stat.type as DiffType | 'all')}
                                    sx={{
                                        p: 2, minWidth: 80, cursor: 'pointer',
                                        background: filterType === stat.type
                                            ? `linear-gradient(110deg, ${getDiffTypeColor(stat.type)}11 60%, #fff 100%)`
                                            : '#fff',
                                        border: `2.5px solid ${getDiffTypeColor(stat.type)}`,
                                        borderRadius: 2,
                                        opacity: filterType === stat.type ? 1 : 0.75,
                                        boxShadow: filterType === stat.type
                                            ? '0 4px 24px 0 rgba(59,130,246,0.09)'
                                            : undefined,
                                        transition: 'all 0.14s',
                                    }}
                                >
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Box sx={{ color: getDiffTypeColor(stat.type) }}>{stat.icon}</Box>
                                        <Box>
                                            <Typography variant="body2" fontWeight={600} color={getDiffTypeColor(stat.type)}>
                                                {stat.label}
                                            </Typography>
                                            <Typography variant="h6" fontWeight={800} color={getDiffTypeColor(stat.type)}>
                                                {stat.type === 'all'
                                                    ? (stats?.added || 0) + (stats?.deleted || 0) + (stats?.changed || 0) + (stats?.same || 0)
                                                    : stats?.[stat.type as DiffType] ?? 0}
                                                개
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </Paper>
                            ))}
                        </Stack>
                    </Paper>

                    {/* 옵션 */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                        <Typography variant="h6" fontWeight={700} color="#0F172A">
                            상세 비교 결과
                        </Typography>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={showAllRows}
                                    onChange={e => setShowAllRows(e.target.checked)}
                                    color="primary"
                                    disabled={filterType !== "all"}
                                />
                            }
                            label={`변경 없는 항목도 표시 (${stats?.same || 0}개)`}
                        />
                    </Stack>

                    {/* 결과 테이블 */}
                    {displayData.length === 0 ? (
                        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="red" fontWeight={500} variant="h6">
                                해당 조건에 맞는 데이터가 없습니다.
                            </Typography>
                        </Paper>
                    ) : (
                        <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                                        <TableCell sx={{ fontWeight: 700, color: '#374151' }}>상태</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#374151' }}>모델</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#374151' }}>코드</TableCell>
                                        {tableFields
                                            .filter(f => f !== "모델" && f !== "코드") // <== 여기서 제거!
                                            .map(f => (
                                                <TableCell key={f} sx={{ fontWeight: 700, color: '#374151' }}>
                                                    {f}
                                                </TableCell>
                                            ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {displayData.map((row, rowIdx) => (
                                        <TableRow key={row.코드 + rowIdx} sx={getRowStyle(row.rowType)}>
                                            {/* 상태 */}
                                            <TableCell>
                                                <Tooltip title={
                                                    row.rowType === 'added' ? '신규 추가됨'
                                                        : row.rowType === 'deleted' ? '삭제됨'
                                                            : row.rowType === 'changed' ? '변경됨'
                                                                : '동일함'
                                                }>
                                                    <Chip
                                                        size="small"
                                                        icon={
                                                            row.rowType === 'added' ? <AddIcon />
                                                                : row.rowType === 'deleted' ? <DeleteIcon />
                                                                    : row.rowType === 'changed' ? <EditIcon />
                                                                        : <CheckIcon />
                                                        }
                                                        label={
                                                            row.rowType === 'added' ? '신규'
                                                                : row.rowType === 'deleted' ? '삭제'
                                                                    : row.rowType === 'changed' ? '변경'
                                                                        : '동일'
                                                        }
                                                        color={
                                                            row.rowType === 'added' ? 'success'
                                                                : row.rowType === 'deleted' ? 'error'
                                                                    : row.rowType === 'changed' ? 'warning'
                                                                        : 'default'
                                                        }
                                                        variant="outlined"
                                                    />
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>{row.모델}</TableCell>
                                            <TableCell sx={{ fontWeight: 600, color: '#2563eb' }}>{row.코드}</TableCell>
                                            {tableFields
                                                .filter(f => f !== "모델" && f !== "코드")
                                                .map((field, cellIdx) => {
                                                    const cell = row.cells.find(c => c.field === field);
                                                    return (
                                                        <TableCell key={field + cellIdx} sx={getCellStyle(cell?.diffType ?? "same")}>
                                                            {cell ? renderCellValue(cell) : ''}
                                                        </TableCell>
                                                    );
                                                })}
                                        </TableRow>
                                    ))}
                                </TableBody>

                            </Table>
                        </Paper>
                    )}
                </>
            )}

            {/* 초기 상태 */}
            {!loading && !diffData && (
                <Paper elevation={1} sx={{ p: 6, textAlign: 'center', backgroundColor: '#f8fafc' }}>
                    <Typography variant="h6" color="#64748b" fontWeight={500}>
                        🚀 두 버전을 선택하고 <strong>[비교하기]</strong> 버튼을 눌러주세요
                    </Typography>
                    <Typography variant="body2" color="#94a3b8" mt={1}>
                        상세한 변경 분석 결과를 확인할 수 있습니다
                    </Typography>
                </Paper>
            )}
        </Box>
    );
};

export default ComparePage;
