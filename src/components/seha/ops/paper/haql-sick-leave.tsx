"use client";

/**
 * «تقرير إجازة مرضية» — مستشفى حقل العام — ported 1:1 from the reference
 * archive (middlewares/paper/haqlSickLeave.js): bordered shadowed title,
 * rounded data card, grey date rows, dotted recommendation sub-items and
 * three signature blocks at the bottom.
 */

import { box, PAPER_FONT_CSS, usePaperData } from "./paper-shared";
import type { PortalSickLeaveRecord } from "@/lib/seha/ops";

const CSS = `${PAPER_FONT_CSS}
  .hql { padding: 0 38px 23px; direction: ltr; }
  .hql .layer { position: relative; z-index: 1; padding-top: 23px; }
  .hql .moh { text-align: center; }
  .hql .moh img { max-height: 62px; object-fit: contain; }
  .hql .hdr { display: flex; align-items: flex-start; gap: 8px; margin-top: 2px; }
  .hql .hdr .en { flex: 1; text-align: left; font-size: 11.6px; font-weight: 700; line-height: 1.62; font-family: 'SLAmiri', serif; }
  .hql .hdr .ar { flex: 1; text-align: right; font-size: 12.4px; font-weight: 700; line-height: 1.62; }
  .hql .title { display: flex; justify-content: center; margin: 10px 0 12px; }
  .hql .title > span { display: inline-block; border: 1.4px solid #000; box-shadow: 3px 3px 0 #000;
    padding: 4px 24px; font-size: 14px; font-weight: 700; line-height: 1.4; text-align: center; }
  .hql .card { border: 1.3px solid #000; border-radius: 12px; overflow: hidden; }
  .hql .crow { display: flex; align-items: baseline; gap: 18px; padding: 3.4px 12px; font-size: 12.4px; font-weight: 700; }
  .hql .crow .en { flex: 1; text-align: left; font-family: 'SLAmiri', serif; }
  .hql .crow .ar { flex: 1; text-align: right; }
  .hql .pad { padding: 6px 0 4px; }
  .hql .drow { display: flex; align-items: stretch; border-top: 1.2px solid #000; background: #d9d9d9; font-size: 12.4px; font-weight: 700; }
  .hql .drow > div { padding: 4px 10px; display: flex; align-items: center; }
  .hql .drow .k-en { width: 26%; font-family: 'SLAmiri', serif; }
  .hql .drow .v-en { width: 22%; justify-content: center; font-family: 'SLAmiri', serif; }
  .hql .drow .tag { width: 16%; justify-content: center; background: #c9c9c9; }
  .hql .drow .v-ar { flex: 1; justify-content: center; }
  .hql .drow .k-ar { width: 20%; justify-content: flex-end; }
  .hql .reco { border-top: 1.2px solid #000; padding: 6px 12px 10px; }
  .hql .reco-h { display: flex; font-size: 12.6px; font-weight: 700; padding-bottom: 3px; }
  .hql .reco-h .en { flex: 1; text-align: left; font-family: 'SLAmiri', serif; }
  .hql .reco-h .ar { flex: 1; text-align: right; }
  .hql .ritem { display: flex; align-items: baseline; gap: 8px; padding: 2.6px 0; font-size: 12.3px; font-weight: 700; }
  .hql .ritem .en { flex: 1; text-align: left; display: flex; gap: 7px; align-items: baseline; font-family: 'SLAmiri', serif; }
  .hql .ritem .ar { flex: 1; text-align: right; display: flex; gap: 7px; align-items: baseline; justify-content: flex-end; }
  .hql .rsub { padding-right: 26px; padding-left: 26px; }
  .hql .dot { display: inline-block; width: 7px; height: 7px; border: 1.2px solid #000; border-radius: 50%; vertical-align: 1px; }
  .hql .signs { display: flex; align-items: flex-start; gap: 6px; border-top: 1.2px solid #000; padding-top: 6px; margin-top: 4px; direction: rtl; }
  .hql .signs > div { flex: 1; text-align: center; font-size: 12.2px; font-weight: 700; line-height: 1.8; }
  .hql .lic { border: 1.1px solid #1a3fa0; color: #1a3fa0; font-size: 10px; padding: 3px 6px;
    display: inline-block; text-align: left; direction: ltr; margin-top: 3px; }
`;

const HDR_EN = [
  "KINGDOM OF SAUDI ARABIA",
  "MINISTRY OF HEALTH",
  "HAQL GENERAL HOSPITAL",
  "MEDICAL SERVICES CENTER",
  "MEDICAL RECORDS DEPARTMENT - MEDICAL REPORTS",
];
const HDR_AR = [
  "المملكة العربية السعودية",
  "وزارة الصــــحة",
  "مستشفى حقل العام",
  "مركز الخدمات الطبية",
  "إدارة السجلات الطبية – التقارير الطبية",
];

type CrowProps = { en: React.ReactNode; ar: React.ReactNode };

function HCrow({ en, ar }: CrowProps) {
  return (
    <div className="crow">
      <span className="en en">{en}</span>
      <span className="ar ar">{ar}</span>
    </div>
  );
}

type RItemProps = { en: React.ReactNode; ar: React.ReactNode; sub?: boolean };

function HRItem({ en, ar, sub }: RItemProps) {
  return (
    <div className={`ritem${sub ? " rsub" : ""}`}>
      <span className="en en">{en}</span>
      <span className="ar ar">{ar}</span>
    </div>
  );
}

export function HaqlSickLeaveDocument({ data }: { data: PortalSickLeaveRecord }) {
  const d = usePaperData(data);
  const recSick = true;

  return (
    <div className="paper-sheet hql">
      <style>{CSS}</style>
      <div className="layer">
        <div className="moh">
          <img src="/assets/pdf/ksa-emblem.jpg" alt="شعار المملكة" />
        </div>
        <header className="hdr">
          <div className="en en">
            {HDR_EN.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
          <div className="ar ar">
            {HDR_AR.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        </header>

        <div className="title">
          <span>
            <span className="ar">تقرير إجازة مرضية</span>
            <br />
            <span className="en">Sick Leave Report</span>
          </span>
        </div>

        <div className="card">
          <div className="pad">
            <HCrow en={`patient name : ${d.nameEn}`} ar={`اسم المريض : ${d.nameAr}`} />
            <HCrow en={`medical record no : ${d.serviceCode}`} ar={`رقم السجل الطبي : ${d.serviceCode}`} />
            <HCrow en={`id no : ${d.nationalId}`} ar={`رقم الهوية : ${d.nationalId}`} />
            <HCrow
              en={<>{box(false)} male &nbsp; {box(false)} female</>}
              ar={<>{box(false)} انثى &nbsp; {box(false)} ذكر</>}
            />
            <HCrow en={`nationality : ${d.nationalityEn}`} ar={`الجنسية : ${d.nationalityAr}`} />
            <HCrow en="date of birth :" ar="تاريخ الميلاد :" />
            <HCrow en="occupation :" ar="المهنة :" />
            <HCrow en={`place of work :`} ar={`جهة العمل : ${d.employerAr}`} />
          </div>

          <div className="drow">
            <div className="k-en en">Date of Adm:</div>
            <div className="v-en en">{d.leaveFromEn}</div>
            <div className="tag" />
            <div className="v-ar ar">{d.leaveFromAr}</div>
            <div className="k-ar ar">تاريخ الدخول :</div>
          </div>
          <div className="drow">
            <div className="k-en en">Date of Discharge:</div>
            <div className="v-en en">{d.leaveToEn}</div>
            <div className="tag" />
            <div className="v-ar ar">{d.leaveToAr}</div>
            <div className="k-ar ar">تاريخ الخروج :</div>
          </div>
          <div className="drow">
            <div className="k-en en">Date of Visit:</div>
            <div className="v-en en">{d.issueEn}</div>
            <div className="tag" />
            <div className="v-ar ar">{d.issueEn}</div>
            <div className="k-ar ar">تاريخ المراجعة :</div>
          </div>

          <div className="reco">
            <div className="reco-h">
              <span className="en">Recommendation:</span>
              <span className="ar">التقرير الطبي والتوصيات:</span>
            </div>

            <HRItem
              en={<>{box(recSick)} Sick Leave for {d.leaveDays} day (s)</>}
              ar={<>منحه إجازة مرضية لمدة :{d.leaveDays} {box(recSick)}</>}
            />
            <HRItem
              sub
              en={<>Starting from {d.leaveFromEn} to {d.leaveToEn}</>}
              ar={<>إعتباراً من {d.leaveFromAr} الى {d.leaveToAr}</>}
            />
            <HRItem
              en={<>{box(false)} Follow up before end of sick leave</>}
              ar={<>مراجعة الطبيب المعالج قبل إنتهاء إجازته {box(false)}</>}
            />
            <HRItem
              en={<>{box(false)} Referral to Medical Committee for following reasons</>}
              ar={<>إحالته للهيئة الطبية العامة لأحد الأسباب التالية : {box(false)}</>}
            />
            <HRItem
              sub
              en={<><span className="dot" /> Approval of Medical Report</>}
              ar={<>إعتماد التقرير الطبي <span className="dot" /></>}
            />
            <HRItem
              sub
              en={<><span className="dot" /> Cannot be treated at this facility</>}
              ar={<>من غير الممكن علاجه في المستشفي <span className="dot" /></>}
            />
            <HRItem
              sub
              en={<><span className="dot" /> Permanent or partial disability</>}
              ar={<>حالته تدل على العجز الصحي بصورة جزئية او قطعية <span className="dot" /></>}
            />
          </div>
        </div>

        <div className="signs">
          <div className="ar">
            الطبيب المعالج
            <br />
            {d.physicianAr}
            {data.showLicense && data.licenseNumber && (
              <div className="lic">License No: {data.licenseNumber}</div>
            )}
          </div>
          <div className="ar">
            تصديق مدير خدمات المرضى والتقارير الطبية.
            <br />
            الاسم :
          </div>
          <div className="ar">
            إدارة شؤون المرضى.
            <br />
            التوقيع :
          </div>
        </div>
      </div>
    </div>
  );
}
