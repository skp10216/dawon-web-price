import React from "react";
import { Button } from "@mui/material";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import * as XLSX from "xlsx";

// ==================
// 타입
// ==================
interface UploadButtonProps {
  onDataParsed: (data: Record<string, any>[]) => void;
}

// ==================
// 엑셀 필드 자동 매핑
// ==================
const FIELD_MAP: Record<string, string> = {
  "LCD점멍(미파손)": "LCD점멍_미파손",
  "내/외부LCD": "내_외부LCD",
  "검불차감(내부)": "검불차감",
  "내부잔상차감(중)": "내부잔상차감_중",
  "내부잔상차감(강)": "내부잔상차감_강",
  "내부잔상차감(대)": "내부잔상차감_대",
  "서브잔상차감(중)": "서브잔상차감_중",
  "서브잔상차감(강)": "서브잔상차감_강",
  "서브잔상차감(대)": "서브잔상차감_대"
  // ... 필요시 추가
};

const UploadButton: React.FC<UploadButtonProps> = ({ onDataParsed }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  // ===== 엑셀 파일 파싱 & 데이터 콜백 =====
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 동기적으로 초기화(동일 파일 업로드 허용)
    if (inputRef.current) inputRef.current.value = "";

    try {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = evt.target?.result;
        if (!data) return;

        // 1. 엑셀 workbook/시트 추출
        const workbook = XLSX.read(data, { type: "binary" });
        const ws = workbook.Sheets[workbook.SheetNames[0]];

        // 2. 시트→json 배열 변환(header: 1 → 2차원 배열)
        const parsed = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as any[][];

        // 3. 헤더 매핑 및 정제
        const headers = (parsed[0] || []).map((h: any) => {
          const clean = String(h ?? "").replace(/\s/g, "");
          return FIELD_MAP[clean] || clean;
        });

        // 4. 실제 데이터 행 변환
        const dataRows = parsed.slice(1).map((row: any[]) => {
          const obj: Record<string, any> = {};
          headers.forEach((key, idx) => {
            obj[key] = row[idx];
          });
          // 빈 key("") 제거
          return Object.fromEntries(Object.entries(obj).filter(([key]) => key));
        })
        // 5. 완전 빈 row(모든 필드 null/빈문자) 제거
        .filter(obj => Object.values(obj).some(v => v !== null && v !== undefined && String(v).trim() !== ""));

        // 6. 상위 콜백
        onDataParsed(dataRows);
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      alert("엑셀 파일 파싱 중 오류가 발생했습니다.");
    }
  };

  // ===== 버튼 클릭 → 파일선택 트리거 =====
  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  // ===== 렌더 =====
  return (
    <>
      <input
        type="file"
        accept=".xlsx, .xls"
        style={{ display: "none" }}
        ref={inputRef}
        onChange={handleFileChange}
      />
      <Button
        variant="contained"
        startIcon={<UploadFileOutlinedIcon />}
        sx={{
          bgcolor: "#3b82f6",
          color: "#fff",
          borderRadius: 2.5,
          fontWeight: 600,
          fontSize: "0.875rem",
          minWidth: 140,
          height: 44,
          textTransform: "none",
          boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)",
          "&:hover": {
            bgcolor: "#2563eb",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)"
          }
        }}
        onClick={handleButtonClick}
      >
        엑셀 업로드
      </Button>
    </>
  );
};

export default UploadButton;
