import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export async function savePriceTableToFirestore({
  category,
  partner,
  region,
  versionName,
  data,
}: {
  category: string;
  partner: string;
  region: string;
  versionName: string;
  data: any[]; // PriceTableRow[]
}) {
  // ✅ 버전명만으로 문서ID 구성 (이미 완성된 형태이므로 중복 방지)
  const docId = versionName.replace(/[.#$/\[\]\s]/g, "_");

  // 실제 저장
  await setDoc(doc(db, "priceTables", docId), {
    category,
    partner,
    region,
    versionName,
    data,
    updatedAt: serverTimestamp(),
  });

  return docId;
}
