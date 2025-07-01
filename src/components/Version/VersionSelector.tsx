import React, { useEffect, useState, useCallback, useRef } from "react";
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
    label?: string;
    selectedId?: string | null;
    onChange?: (id: string) => void;
    loading?: boolean;
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
    const lastFetchedVersionId = useRef<string | null>(null);

    // 버전 목록 fetch
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
                // 최신순 정렬
                const sorted = list.sort((a, b) => (b.updatedAt ?? 0) > (a.updatedAt ?? 0) ? 1 : -1);
                setVersions(sorted);

                // 최초 진입 시 기본값 (selectedId와 overrideSelectedId 모두 없을 때)
                if (sorted.length > 0 && !selectedId && !overrideSelectedId && onVersionIdInit) {
                    onVersionIdInit(sorted[0].id);
                }
            } finally {
                setFetching(false);
            }
        };
        fetchVersions();
        // eslint-disable-next-line
    }, [refreshKey]);

    // 드롭다운 값 계산
    const versionIds = versions.map(v => v.id);
    const availableValues = [
        ...(showExcelTemp ? ["excel_temp"] : []),
        ...versionIds,
    ];
    const actualSelected =
        selectedId && availableValues.includes(selectedId)
            ? selectedId
            : "";

    // 드롭다운에서 선택 변경 시
    const handleChange = useCallback(
        (e: any) => {
            const versionId = e.target.value;
            onChange?.(versionId);
            // Firestore fetch는 아래 useEffect에서!
        },
        [onChange]
    );

    // selectedId가 바뀔 때만 Firestore fetch → onVersionChange 콜백
    useEffect(() => {
        // excel_temp는 Dashboard에서 상태 관리, 여기서는 패스
        if (
            selectedId &&
            selectedId !== "excel_temp" &&
            versions.some(v => v.id === selectedId)
        ) {
            // 🚩 중복 fetch 방지: 마지막으로 fetch한 버전과 다를 때만 fetch
            if (lastFetchedVersionId.current === selectedId) {
                return;
            }
            lastFetchedVersionId.current = selectedId;

            const fetchAndSetVersion = async () => {
                const docRef = doc(db, "priceTables", selectedId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    // 부모의 데이터와 실제로 다를 때만 콜백 실행 (불변성 체크)
                    onVersionChange?.(
                        data.data ?? [],
                        {
                            id: selectedId,
                            versionName: data.versionName ?? "",
                            updatedAt: data.updatedAt ? data.updatedAt.toDate?.()?.toLocaleString() : "",
                            category: data.category ?? "",
                            partner: data.partner ?? "",
                            region: data.region ?? "",
                            label: makeVersionLabel({
                                category: data.category ?? "",
                                partner: data.partner ?? "",
                                region: data.region ?? "",
                                versionName: data.versionName ?? selectedId,
                                id: selectedId,
                            }),
                        }
                    );
                }
            };
            fetchAndSetVersion();
        } else if (selectedId === "excel_temp") {
            // 임시 데이터는 Dashboard에서 별도 처리
        }
        // eslint-disable-next-line
    }, [selectedId, versions, onVersionChange]);

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
                value={actualSelected}
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
