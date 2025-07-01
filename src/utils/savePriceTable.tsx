import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export async function savePriceTableToFirestore(
  {
    category,
    partner,
    region,
    versionName,
    data,
    id,
  }: {
    category: string;
    partner: string;
    region: string;
    versionName: string;
    data: any[];
    id?: string;
  },
  update: boolean = false
) {
  let docId = id;
  if (!docId) {
    docId = versionName.replace(/[.#$/\[\]\s]/g, "_");
  }

  const ref = doc(db, "priceTables", docId);
  const docData = {
    category,
    partner,
    region,
    versionName,
    data,
    updatedAt: serverTimestamp(),
  };

  if (update) {
    await setDoc(ref, docData, { merge: true });
  } else {
    await setDoc(ref, docData);
  }

  return docId;
}
