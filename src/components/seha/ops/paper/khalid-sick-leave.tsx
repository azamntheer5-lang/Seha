"use client";

/**
 * «تقرير بأجازة مرضية (ج)» — SICK LEAVE REPORT ( C )
 * مجمع خالد المتميز الطبي — ported 1:1 from the reference archive
 * (middlewares/paper/khalidSickLeave.js). Layout, spacing and the original
 * form's typographical quirks («bate of BIrth», «Adm, Dato»…) are kept
 * faithful to the paper original.
 */

import { box, dashStyle, PAPER_FONT_CSS, usePaperData } from "./paper-shared";
import type { PortalSickLeaveRecord } from "@/lib/seha/ops";

const CSS = `${PAPER_FONT_CSS}
  .khl { padding: 23px 23px 15px; direction: ltr; }
  .khl .hdr { display: flex; align-items: flex-start; gap: 6px; }
  .khl .hdr-en { flex: 1; font-size: 11px; font-weight: 700; line-height: 1.28; text-align: left; font-family: 'SLAmiri', serif; }
  .khl .hdr-ar { flex: 1; font-size: 11.5px; font-weight: 700; line-height: 1.38; text-align: right; }
  .khl .hdr-logo { width: 108px; flex-shrink: 0; text-align: center; padding-top: 2px; }
  .khl .hdr-logo img { max-width: 100%; max-height: 78px; object-fit: contain; }
  .khl .title-row { display: flex; justify-content: center; margin: 2px 0 6px; }
  .khl .title-box { border: 1.6px solid #000; padding: 2px 14px; display: flex; gap: 26px;
    align-items: center; font-size: 14.5px; font-weight: 700; }
  .khl .bx { border: 1.6px solid #000; }
  .khl .bx + .bx { border-top: 0; }
  .khl .sec { padding: 4px 9px; }
  .khl .row { display: flex; align-items: baseline; gap: 8px; padding: 1.7px 0; }
  .khl .row .l { flex: 0 0 34%; font-size: 12.8px; font-weight: 700; text-align: left; font-family: 'SLAmiri', serif; }
  .khl .row .v { flex: 1; font-size: 12.8px; font-weight: 700; text-align: center; }
  .khl .row .r { flex: 0 0 34%; font-size: 12.8px; font-weight: 700; text-align: right; }
  .khl .sex { display: flex; align-items: center; gap: 8px; padding: 1.7px 0; font-size: 12.8px; font-weight: 700; }
  .khl .sex .side { flex: 0 0 34%; display: flex; gap: 26px; }
  .khl .sex .side.rt { justify-content: flex-end; direction: rtl; }
  .khl .sex .mid { flex: 1; }
  .khl .reco-head { display: flex; align-items: baseline; padding: 1px 0 4px; }
  .khl .reco-head .en { flex: 1; font-size: 15px; font-weight: 700; text-align: left; padding-left: 62px; font-family: 'SLAmiri', serif; }
  .khl .reco-head .ar { flex: 1; font-size: 14px; font-weight: 700; text-align: right; letter-spacing: .5px; }
  .khl .reco-sub { display: flex; align-items: baseline; font-size: 12.6px; font-weight: 700; padding-bottom: 4px; }
  .khl .reco-sub .en { flex: 1; text-align: left; font-family: 'SLAmiri', serif; }
  .khl .reco-sub .ar { flex: 1; text-align: right; }
  .khl .item { display: flex; align-items: baseline; gap: 8px; padding: 2.2px 0; font-size: 12.8px; font-weight: 700; }
  .khl .item .en { flex: 1; display: flex; align-items: baseline; gap: 7px; text-align: left; font-family: 'SLAmiri', serif; }
  .khl .item .ar { flex: 1; display: flex; align-items: baseline; gap: 7px; justify-content: flex-end; text-align: right; }
  .khl .item .mid { flex: 0 0 auto; text-align: center; font-size: 12.6px; }
  .khl .sub { padding-left: 30px; }
  .khl .pline { display: flex; align-items: baseline; gap: 8px; padding: 2.6px 0; font-size: 12.8px; font-weight: 700; }
  .khl .pline .en { flex: 1; text-align: left; font-family: 'SLAmiri', serif; }
  .khl .pline .ar { flex: 1; text-align: right; }
  .khl .foot { position: relative; padding: 5px 9px 3px; font-size: 12.4px; font-weight: 700; line-height: 1.72; }
  .khl .foot .ln { display: flex; justify-content: space-between; }
`;

const HDR_EN = [
  "Khalid Distinct Medical Center",
  "FOR GENERAL MEDICINE",
  "Jeddah-Kilo 8-baladiya Al-Jamea",
  "St.-Al-Rawaby dist",
  "Tel: 6255555 (20 Lines) - Fax: 6242924",
  "P.B.box 30059 Jeddah 21477-VAT No.",
  "300241963900003",
];
const HDR_AR = [
  "مجمع خالد المتميز الطبي",
  "للطــب العــام",
  "جده – كيلو 8 – شارع بلدية الجامعة – حي الروابي",
  "6242924 (20) 6255555 ملف",
  "ص ب 30050 جده 21477 – الرقم الضريبي",
  "300241963900003",
];

type RowProps = { l: string; v?: string; r: string };

function KRow({ l, v, r }: RowProps) {
  return (
    <div className="row">
      <span className="l en">{l}</span>
      <span className="v">{v ?? ""}</span>
      <span className="r ar">{r}</span>
    </div>
  );
}

export function KhalidSickLeaveDocument({ data }: { data: PortalSickLeaveRecord }) {
  const d = usePaperData(data);
  const recSick = true; // this report IS a granted sick leave

  return (
    <div className="paper-sheet khl">
      <style>{CSS}</style>

      <header className="hdr">
        <div className="hdr-en en">
          {HDR_EN.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
        <div className="hdr-logo">
          <img src="/assets/paper/facility-default.png" alt="شعار المنشأة" />
        </div>
        <div className="hdr-ar ar">
          {HDR_AR.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </header>

      <div className="title-row">
        <span className="title-box">
          <span className="en">SICK LEAVE REPORT ( C )</span>
          <span className="ar">تقرير بأجازة مرضية (ج)</span>
        </span>
      </div>

      {/* بيانات المريض */}
      <div className="bx">
        <div className="sec">
          <KRow l={`Patient Name: ${d.nameEnUpper}`} r={`${d.nameAr}  : اسم المريض`} />
          <KRow l="Medical Record No:" v={d.serviceCode} r="رقم السجل الطبي :" />
          <div className="sex">
            <span className="side en">
              {box(false)} M &nbsp;&nbsp;&nbsp; {box(false)} F
            </span>
            <span className="mid" />
            <span className="side rt ar">
              {box(false)} انثى &nbsp;&nbsp;&nbsp; {box(false)} ذكر
            </span>
          </div>
          <KRow l="Nationality:" v={d.nationalityAr} r="الجنسية :" />
          <KRow l="bate of BIrth:" r="تاريخ الميلاد:" />
          <KRow l="Occupation :" r="المهنة :" />
          <KRow l="Place of work:" v={d.employerAr} r="جهة العمل :" />
          <KRow l="Date of visit:" v={d.issueEn} r="تاريخ المراجعة :" />
          <KRow l="Adm, Dato:" v={d.leaveFromEn} r="تاريخ الدخول :" />
          <KRow l="Discharge Dato:" v={d.leaveToEn} r="تاريخ الخروج :" />
        </div>
      </div>

      {/* التوصيات */}
      <div className="bx">
        <div className="sec">
          <div className="reco-head">
            <span className="en">Recommendation</span>
            <span className="ar">التوصــــيات</span>
          </div>
          <div className="reco-sub">
            <span className="en">Following medical examination, It is recommended:</span>
            <span className="ar">بالكشف على المريض نوصي بالآتي :</span>
          </div>

          <div className="item">
            <span className="en">
              {box(recSick)} Sick leave for {d.leaveDays} day(s)
            </span>
            <span className="ar">
              منحه اجازة مرضية لمدة {d.leaveDays} يوم {box(recSick)}
            </span>
          </div>
          <div className="item sub">
            <span className="en">
              Starting from: {d.leaveFromEn} To {d.leaveToEn}
            </span>
            <span className="ar">
              اعتبارا من {d.leaveFromAr} إلى {d.leaveToAr}
            </span>
          </div>
          <div className="item">
            <span className="en">{box(false)} Follow up before end of sick leave</span>
            <span className="ar">مراجعة الطبيب المعالج قبل إنتهاء أجازته . {box(false)}</span>
          </div>
          <div className="item">
            <span className="en">{box(false)} Referral to medical committe for following reasons:</span>
            <span className="ar">إحالته إلى الهيئة الطبية العامة لأحد الأسباب التالية : {box(false)}</span>
          </div>
          <div style={{ height: 13 }} />
          <div className="item">
            <span className="en">{box(false)} Approval of sick leave:</span>
            <span className="ar">اعتماد التقرير الطبي : {box(false)}</span>
          </div>
          <div className="item">
            <span className="en">{box(false)} Can not be treated at this Facility:</span>
            <span className="ar">من غير الممكن علاجه في المستشفى : {box(false)}</span>
          </div>
          <div className="item">
            <span className="en">{box(false)} Permanent or partial disability:</span>
            <span className="ar">حالته تدل على عجزه الصحي عن العمل بصورة جزئية أو قطعية : {box(false)}</span>
          </div>
          <div className="item">
            <span className="en">{box(false)} Others</span>
            <span className="mid" />
            <span className="ar">اخرى {box(false)}</span>
          </div>
        </div>
      </div>

      {/* الأطباء */}
      <div className="bx">
        <div className="sec">
          <div className="pline">
            <span className="en">Treating Physician Name: {d.physicianEnUpper}</span>
            <span className="ar">{d.physicianAr} :إسم الطبيب المعالج</span>
          </div>
          <div className="pline">
            <span className="en">
              Signature: <span style={dashStyle} /> Badge No:
            </span>
            <span className="ar">
              <span style={dashStyle} /> : التوقيع
            </span>
          </div>
          <div className="pline">
            <span className="en">Physician Name: {d.physicianEnUpper}</span>
            <span className="ar">{d.physicianAr} : إسم الطبيب</span>
          </div>
          <div className="pline">
            <span className="en">
              Signature: <span style={dashStyle} />
            </span>
            <span className="ar">
              <span style={dashStyle} /> : التوقيع
            </span>
          </div>
          <div className="pline">
            <span className="en">
              Approval of the Director:{" "}
              <span style={{ ...dashStyle, minWidth: 250 }} />
            </span>
            <span className="ar">تصديق مدير المجمع الطبي العام</span>
          </div>
          <div className="pline">
            <span className="en">Name:</span>
            <span className="ar">: الاسم</span>
          </div>
          <div className="pline">
            <span className="en">
              Signature: <span style={dashStyle} /> Date:<span style={dashStyle} />
            </span>
            <span className="ar">
              <span style={dashStyle} /> :التاريخ &nbsp;&nbsp; <span style={dashStyle} /> :التوقيع
            </span>
          </div>
        </div>
      </div>

      {/* التذييل الإداري */}
      <div className="bx">
        <div className="foot ar">
          <div className="ln">
            <span>سعادة : </span>
            <span>المحترم</span>
          </div>
          <div className="ln">
            <span>إشارة إلى إحالتكم رقم : </span>
            <span>وتاريخ </span>
          </div>
          <div>بشأن طلب الكشف على الموضح اسمه أعلاه</div>
          <div>إشارة إلى مراجعة الموظف لديكم الموضح اسمه أعلاه للكشف عليه :</div>
          <div>تجدون بعالية التقرير الصادر بشأنه</div>
          <div>مدير المجمع الطبي العام :..............................</div>
          <div>الاسم :</div>
          <div>التوقيع :..............................</div>
        </div>
      </div>
    </div>
  );
}
