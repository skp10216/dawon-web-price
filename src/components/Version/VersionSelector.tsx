import React, { useEffect, useState, useCallback } from "react";
import {
    FormControl, InputLabel, Select, MenuItem, CircularProgress, Box, Typography
} from "@mui/material";
import { db } from "../../firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import type { PriceTableRow } from "../DataTable/samplePriceTableData";

// ===== 한글 변환 상수 =====
const CATEGORY_MAP: Record<string, string> = {
    galaxyfold: "갤럭시 폴드/플립",
    galaxy: "갤럭시",
    apple: "애플",
    ipad: "아이패드"
};
const REGION_MAP: Record<string, string> = {
    kr: "국내",
    global: "국외"
};

// ===== 메타 정보 타입 =====
type VersionMeta = {
    id: string;
    versionName: string;
    updatedAt?: any;
    category: string;
    partner: string;
    region: string;
    label: string;
};

interface VersionSelectorProps {
    refreshKey?: any;
    onVersionChange: (rows: PriceTableRow[], meta: VersionMeta | null) => void;
    overrideSelectedId?: string | null;
    onVersionIdInit?: (id: string) => void;
    showExcelTemp?: boolean;    // ← 상위에서 명시적으로 전달
}

// ===== 버전 라벨 생성 함수 =====
function makeVersionLabel(meta: {
    category: string;
    partner: string;
    region: string;
    versionName: string;
    id: string;
}) {
    const base = `${meta.category}_${meta.partner}_${meta.region}`;
    if (meta.versionName?.startsWith(base)) {
        return meta.versionName;
    }
    return `[${CATEGORY_MAP[meta.category] ?? meta.category}]_${meta.partner}_${REGION_MAP[meta.region] ?? meta.region}_${meta.versionName ?? meta.id}`;
}

const VersionSelector: React.FC<VersionSelectorProps> = ({
    onVersionChange,
    refreshKey,
    overrideSelectedId,
    onVersionIdInit,
    showExcelTemp = false,    // ← 기본값 false
}) => {
    const [versions, setVersions] = useState<VersionMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<string>("");

    // overrideSelectedId가 바뀌면 선택값 덮어쓰기
    useEffect(() => {
        if (overrideSelectedId !== undefined && overrideSelectedId !== null) {
            setSelected(overrideSelectedId);
        }
    }, [overrideSelectedId]);

    // 버전 목록 불러오기
    useEffect(() => {
        const fetchVersions = async () => {
            setLoading(true);
            try {
                const snap = await getDocs(collection(db, "priceTables"));
                const list: VersionMeta[] = [];
                snap.forEach(docSnap => {
                    const d = docSnap.data();
                    list.push({
                        id: docSnap.id,
                        versionName: d.versionName ?? docSnap.id,
                        updatedAt: d.updatedAt ? d.updatedAt.toDate?.()?.toLocaleString() : undefined,
                        category: d.category ?? "",
                        partner: d.partner ?? "",
                        region: d.region ?? "",
                        label: makeVersionLabel({
                            category: d.category ?? "",
                            partner: d.partner ?? "",
                            region: d.region ?? "",
                            versionName: d.versionName ?? docSnap.id,
                            id: docSnap.id
                        })
                    });
                });
                const sorted = list.sort((a, b) => (b.updatedAt ?? 0) > (a.updatedAt ?? 0) ? 1 : -1);
                setVersions(sorted);

                // 최초 선택
                if (sorted.length > 0 && !overrideSelectedId) {
                    const firstId = sorted[0].id;
                    setSelected(firstId);
                    fetchAndSetVersion(firstId, onVersionChange);
                    onVersionIdInit?.(firstId);
                } else if (!overrideSelectedId) {
                    setSelected("");
                    onVersionChange([], null);
                }
            } finally {
                setLoading(false);
            }
        };
        const fetchAndSetVersion = async (versionId: string, onVersionChange: VersionSelectorProps["onVersionChange"]) => {
            const docRef = doc(db, "priceTables", versionId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                onVersionChange(
                    data.data ?? [],
                    {
                        id: versionId,
                        versionName: data.versionName ?? "",
                        updatedAt: data.updatedAt ? data.updatedAt.toDate?.()?.toLocaleString() : "",
                        category: data.category ?? "",
                        partner: data.partner ?? "",
                        region: data.region ?? "",
                        label: makeVersionLabel({
                            category: data.category ?? "",
                            partner: data.partner ?? "",
                            region: data.region ?? "",
                            versionName: data.versionName ?? versionId,
                            id: versionId,
                        }),
                    }
                );
            }
        };
        fetchVersions();
    }, [refreshKey, overrideSelectedId, onVersionChange, onVersionIdInit]);

    // value 관리
    const versionIds = versions.map(v => v.id);
    const availableValues = [
        ...(showExcelTemp ? ["excel_temp"] : []),
        ...versionIds,
    ];
    const actualSelected = availableValues.includes(selected) ? selected : "";

    // 서버 데이터 선택시 임시항목 숨김 (상위에서 showExcelTemp=false로 만들면 사라짐)
    const handleChange = useCallback(
        async (e: any) => {
            const versionId = e.target.value;
            // 임시데이터 선택 중 다른 서버 데이터로 이동 시
            if (showExcelTemp && versionId !== "excel_temp") {
                const ok = window.confirm(
                    "서버에 저장되지 않았습니다. 저장하지 않는 데이터는 손실됩니다.\n계속하시겠습니까?"
                );
                if (!ok) return;
                // 여기서는 showExcelTemp 상태를 직접 조작하지 않고 상위가 해제!
            }
            setSelected(versionId);
            if (versionId !== "excel_temp") {
                const docRef = doc(db, "priceTables", versionId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    onVersionChange(
                        data.data ?? [],
                        {
                            id: versionId,
                            versionName: data.versionName ?? "",
                            updatedAt: data.updatedAt ? data.updatedAt.toDate?.()?.toLocaleString() : "",
                            category: data.category ?? "",
                            partner: data.partner ?? "",
                            region: data.region ?? "",
                            label: makeVersionLabel({
                                category: data.category ?? "",
                                partner: data.partner ?? "",
                                region: data.region ?? "",
                                versionName: data.versionName ?? versionId,
                                id: versionId,
                            }),
                        }
                    );
                }
            } else {
                // 엑셀 임시 데이터 선택 시, 실제 데이터 및 meta는 상위에서 관리
                onVersionChange([], null);
            }
        },
        [onVersionChange, showExcelTemp, versions]
    );

    return (
        <FormControl
            size="small"
            sx={{
                minWidth: 220,
                bgcolor: "#fff",
                borderRadius: 2,
                "& .MuiInputLabel-root": { fontWeight: 600, color: "#2563EB" },
                "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    fontWeight: 600,
                    bgcolor: "#fff",
                },
            }}
        >
            <InputLabel id="version-label">버전 선택</InputLabel>
            <Select
                labelId="version-label"
                value={actualSelected}
                label="버전 선택"
                onChange={handleChange}
                disabled={loading}
                sx={{ fontWeight: 700 }}
            >
                {loading ? (
                    <MenuItem value="">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <CircularProgress size={18} />
                            로딩 중...
                        </Box>
                    </MenuItem>
                ) : (
                    [
                        ...(showExcelTemp
                            ? [
                                <MenuItem key="excel_temp" value="excel_temp">
                                    <Typography sx={{ color: "#F87171", fontWeight: 700 }}>
                                        엑셀 업로드 중 (임시 데이터)
                                    </Typography>
                                </MenuItem>
                            ]
                            : []),
                        ...versions.map(v => (
                            <MenuItem key={v.id} value={v.id}>
                                {v.label}
                            </MenuItem>
                        )),
                    ]
                )}
            </Select>
        </FormControl>
    );
};

export default VersionSelector;
