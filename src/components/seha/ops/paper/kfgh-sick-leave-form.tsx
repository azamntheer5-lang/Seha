"use client";

/**
 * «تقرير إجازة مرضية» (نموذج Word) — مستشفى الملك فهد العام — ported 1:1
 * from the reference archive (middlewares/paper/kfghSickLeaveForm.js):
 * full-width letterhead image, bilingual patient rows, recommendations block,
 * three physician rows with signatures, seals, and the underlined e-document
 * footnote.
 */

import { box, PAPER_FONT_CSS, usePaperData } from "./paper-shared";
import type { PortalSickLeaveRecord } from "@/lib/seha/ops";

const CSS = `${PAPER_FONT_CSS}
  .kfg { padding: 30px 45px 23px; direction: ltr; }
  .kfg .lh { text-align: center; margin-bottom: 4px; }
  .kfg .lh > img { width: 100%; height: auto; object-fit: contain; display: block; }
  .kfg .brow { display: flex; align-items: baseline; gap: 16px; padding: 4.4px 0; font-size: 13px; font-weight: 700; }
  .kfg .brow .en { flex: 1; text-align: left; font-family: 'SLAmiri', serif; }
  .kfg .brow .ar { flex: 1; text-align: right; }
  .kfg .gap { height: 10px; }
  .kfg .reco { margin-top: 4px; }
  .kfg .reco .brow { padding: 5.5px 0; }
  .kfg .docs { margin-top: 14px; }
  .kfg .drow { display: flex; align-items: flex-end; gap: 12px; padding: 7px 0; font-size: 13px; font-weight: 700; }
  .kfg .drow .en { flex: 1; text-align: left; display: flex; gap: 46px; font-family: 'SLAmiri', serif; }
  .kfg .drow .ar { flex: 1; text-align: right; }
  .kfg .drow .ar img { max-height: 40px; max-width: 150px; object-fit: contain; vertical-align: -14px; }
  .kfg .seals { display: flex; align-items: flex-start; gap: 12px; margin-top: 12px; font-size: 13px; font-weight: 700; }
  .kfg .seals .en { flex: 1; text-align: left; font-family: 'SLAmiri', serif; }
  .kfg .seals .ar { flex: 1; text-align: right; }
  .kfg .seals img { display: block; margin-top: 4px; max-height: 118px; max-width: 200px; object-fit: contain; }
  .kfg .seals .en img { margin-left: 34px; }
  .kfg .seals .ar img { margin-right: 34px; margin-left: auto; }
  .kfg .efoot { position: absolute; left: 45px; right: 45px; bottom: 26px; text-align: center;
    font-size: 10.6px; font-weight: 700; text-decoration: underline; line-height: 1.65; }
`;

type BRowProps = { en: React.ReactNode; ar: React.ReactNode };

function KfRow({ en, ar }: BRowProps) {
  return (
    <div className="brow">
      <span className="en en">{en}</span>
      <span className="ar ar">{ar}</span>
    </div>
  );
}

export function KfghSickLeaveFormDocument({ data }: { data: PortalSickLeaveRecord }) {
  const d = usePaperData(data);

  return (
    <div className="paper-sheet kfg">
      <style>{CSS}</style>

      <div className="lh">
        <img src="/assets/paper/kfgh-letterhead.png" alt="ترويسة مستشفى الملك فهد العام" />
      </div>

      <KfRow en={`Full Name: ${d.nameEn}`} ar={`اسم المريض الكامل : ${d.nameAr}`} />
      <KfRow
        en={<>{box(false)} Male &nbsp;&nbsp;&nbsp; {box(false)} Female</>}
        ar={<>{box(false)} انثى &nbsp;&nbsp;&nbsp; {box(false)} ذكر &nbsp;&nbsp; : الجنس</>}
      />
      <KfRow en={`Patient File NO : ${d.serviceCode}`} ar={`رقم الملف الطبي : ${d.serviceCode}`} />
      <KfRow
        en={`Nationality: ${d.nationalityEn}`}
        ar={`الجنسية : ${d.nationalityAr}`}
      />
      <KfRow en={`Address :`} ar={`رقم الهوية : ${d.nationalId}`} />
      <KfRow en={`Place of work :`} ar={`جهة العمل : ${d.employerAr}`} />
      <KfRow en={`Date of Clinic visit : ${d.issueEn}`} ar={`تاريخ مراجعة العيادة : ${d.issueEn}`} />
      <KfRow en={`Admission date: ${d.leaveFromEn}`} ar={`تاريخ دخول المستشفى : ${d.leaveFromAr}`} />
      <KfRow en={`Date of discharge: ${d.leaveToEn}`} ar={`تاريخ الخروج من المستشفى : ${d.leaveToAr}`} />

      <div className="gap" />
      <div className="reco">
        <KfRow en="Recommendations:" ar="التوصيــات :" />
        <KfRow
          en="The patient must return to hospital if symptoms worsen"
          ar="عليه مراجعة المستشفى عند الشعور بعدم التحسن"
        />
        <KfRow
          en={<>The individual named above is in need for sick leave For ( {d.leaveDays} ) Days</>}
          ar={<>يحتاج إلى اجازة مرضية لمدة ( {d.leaveDays} ) أيام</>}
        />
        <KfRow en={<>sick leave starting from : {d.leaveFromEn}</>} ar={<>اعتبارا من تاريخ : {d.leaveFromAr}</>} />
        <KfRow en={<>to : {d.leaveToEn}</>} ar={<>الى تاريخ : {d.leaveToAr}</>} />
      </div>

      <div className="docs">
        <div className="drow">
          <span className="en">
            <span>Name of physician:</span>
            <span>signature:</span>
          </span>
          <span className="ar">
            <img src="/assets/paper/kfgh-physician-signature.png" alt="" /> التوقيع :
            &nbsp; {d.physicianAr} : الطبيب
          </span>
        </div>
        <div className="drow">
          <span className="en">
            <span>Name of physician:</span>
            <span>signature:</span>
          </span>
          <span className="ar">التوقيع : &nbsp; : الطبيب</span>
        </div>
        <div className="drow">
          <span className="en">
            <span>Name of physician:</span>
            <span>signature:</span>
          </span>
          <span className="ar">التوقيع : &nbsp; : الطبيب</span>
        </div>
      </div>

      <div className="seals">
        <span className="en">
          <span>the seal :</span>
          <img src="/assets/paper/kfgh-seal-oval.png" alt="" />
        </span>
        <span className="ar">
          <span>: الختم</span>
          <img src="/assets/paper/kfgh-seal-rect.png" alt="" />
        </span>
      </div>

      <div className="efoot ar">
        هذه الوثيقة صادرة من قسم التقارير الطبية عن طريق الحاسب الآلي معتمدة بالتوقيع
        الألكتروني ولا تحتاج إلى توقيع يدوي ويكتفى بالختم الرسمي لمستشفى الملك فهد العام
      </div>
    </div>
  );
}
