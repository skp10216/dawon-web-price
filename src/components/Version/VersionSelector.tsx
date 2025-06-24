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

export interface VersionSelectorProps {
    // === 공통/비교용 ===
    label?: string;
    selectedId?: string | null;
    onChange?: (id: string) => void;
    loading?: boolean;  // Compare 등 외부에서 로딩 제어
    // === 관리/임시데이터용 ===
    refreshKey?: any;
    onVersionChange?: (rows: PriceTableRow[], meta: VersionMeta | null) => void;
    overrideSelectedId?: string | null;
    onVersionIdInit?: (id: string) => void;
    showExcelTemp?: boolean;
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
    label = "버전 선택",
    selectedId,
    onChange,
    loading = false,

    onVersionChange,
    refreshKey,
    overrideSelectedId,
    onVersionIdInit,
    showExcelTemp = false,
}) => {
    const [versions, setVersions] = useState<VersionMeta[]>([]);
    const [fetching, setFetching] = useState(true);
    const [selected, setSelected] = useState<string>("");

    // overrideSelectedId가 바뀌면 선택값 덮어쓰기
    useEffect(() => {
        if (overrideSelectedId !== undefined && overrideSelectedId !== null) {
            setSelected(overrideSelectedId);
        }
    }, [overrideSelectedId]);

    // 버전 목록 불러오기 (비교든 관리든 공통)
    useEffect(() => {
        const fetchVersions = async () => {
            setFetching(true);
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

                // 최초 선택 및 관리모드의 콜백 처리
                if (sorted.length > 0 && !overrideSelectedId && onVersionChange) {
                    const firstId = sorted[0].id;
                    setSelected(firstId);
                    fetchAndSetVersion(firstId, onVersionChange);
                    onVersionIdInit?.(firstId);
                } else if (!overrideSelectedId && onVersionChange) {
                    setSelected("");
                    onVersionChange([], null);
                }
            } finally {
                setFetching(false);
            }
        };
        const fetchAndSetVersion = async (versionId: string, onVersionChange: VersionSelectorProps["onVersionChange"]) => {
            const docRef = doc(db, "priceTables", versionId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                onVersionChange?.(
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

    // value 관리(공통)
    const versionIds = versions.map(v => v.id);
    const availableValues = [
        ...(showExcelTemp ? ["excel_temp"] : []),
        ...versionIds,
    ];
    // Compare용: selectedId, 관리용: selected (overrideSelectedId로도 제어)
    const actualSelected =
        selectedId !== undefined && selectedId !== null
            ? selectedId
            : availableValues.includes(selected)
                ? selected
                : "";

    // 선택 변경
    const handleChange = useCallback(
        async (e: any) => {
            const versionId = e.target.value;
            // Compare/공통: onChange prop으로 콜백
            if (onChange) {
                onChange(versionId);
            }
            // 관리/임시데이터: onVersionChange로 동작
            if (onVersionChange) {
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
                    onVersionChange([], null);
                }
            }
            setSelected(versionId);
        },
        [onChange, onVersionChange, showExcelTemp, versions]
    );

    // value를 항상 메뉴에 있는 값 또는 ''로 제한
    const availableVersionIds = availableValues;
    const safeValue =
        (loading || fetching || availableVersionIds.length === 0)
            ? ""
            : (
                actualSelected &&
                    availableVersionIds.includes(actualSelected)
                    ? actualSelected
                    : ""
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
            <InputLabel id="version-label">{label}</InputLabel>
            <Select
                labelId="version-label"
                value={safeValue}
                label={label}
                onChange={handleChange}
                disabled={loading || fetching}
                sx={{ fontWeight: 700 }}
            >
                {(loading || fetching) ? (
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
