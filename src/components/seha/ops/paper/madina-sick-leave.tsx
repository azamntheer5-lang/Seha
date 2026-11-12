"use client";

/**
 * «تقرير إجازة مرضية» — مستشفى المدينة الوطني — ported 1:1 from the
 * reference archive (middlewares/paper/madinaSickLeave.js): tri-logo header,
 * bilingual intro paragraph, two columns separated by a vertical rule, section
 * heads underlined, and the Seha platform footer.
 */

import { PAPER_FONT_CSS, usePaperData } from "./paper-shared";
import type { PortalSickLeaveRecord } from "@/lib/seha/ops";

const CSS = `${PAPER_FONT_CSS}
  .mdn { padding: 30px 45px 23px; direction: ltr; }
  .mdn .hdr { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .mdn .hdr .side { width: 150px; flex-shrink: 0; text-align: center; }
  .mdn .hdr .side img { max-width: 100%; max-height: 62px; object-fit: contain; }
  .mdn .hdr .mid { flex: 1; text-align: center; line-height: 1.35; }
  .mdn .hdr .t-ar { font-size: 16px; font-weight: 700; }
  .mdn .hdr .t-en { font-size: 15px; font-weight: 700; font-family: 'SLAmiri', serif; }
  .mdn .intro { display: flex; gap: 20px; margin-bottom: 12px; font-size: 12.2px; line-height: 1.65; }
  .mdn .intro .en { flex: 1; text-align: left; font-weight: 600; font-family: 'SLAmiri', serif; }
  .mdn .intro .ar { flex: 1; text-align: right; font-weight: 600; }
  .mdn .grid { border-top: 1.4px solid #000; }
  .mdn .srow { display: flex; align-items: stretch; }
  .mdn .srow > .en, .mdn .srow > .ar { flex: 1; padding: 5px 14px; font-size: 12.2px; line-height: 1.5; }
  .mdn .srow > .en { text-align: left; border-right: 1.4px solid #000; font-family: 'SLAmiri', serif; }
  .mdn .srow > .ar { text-align: right; font-weight: 600; }
  .mdn .srow.head > .en, .mdn .srow.head > .ar { font-size: 13.2px; font-weight: 700; text-align: center; font-family: 'SLNotoSansArabic', sans-serif; }
  .mdn .srow.head { border-bottom: 1.4px solid #000; }
  .mdn .srow.rule { border-top: 1.4px solid #000; }
  .mdn .indent { padding-left: 26px !important; }
  .mdn .indent-ar { padding-right: 26px !important; }
  .mdn .foot { margin-top: 10px; text-align: center; }
  .mdn .foot img { max-height: 46px; object-fit: contain; }
  .mdn .foot .cap { font-size: 13px; font-weight: 700; color: #1f8a80; margin-top: 2px; }
`;

type SRowProps = {
  en: React.ReactNode;
  ar: React.ReactNode;
  head?: boolean;
  rule?: boolean;
};

function MRow({ en, ar, head, rule }: SRowProps) {
  return (
    <div className={`srow${head ? " head" : ""}${rule ? " rule" : ""}`}>
      <div className="en">{en}</div>
      <div className="ar">{ar}</div>
    </div>
  );
}

export function MadinaSickLeaveDocument({ data }: { data: PortalSickLeaveRecord }) {
  const d = usePaperData(data);
  const days = d.leaveDays;

  return (
    <div className="paper-sheet mdn">
      <style>{CSS}</style>

      <header className="hdr">
        <div className="side">
          <img src="/assets/pdf/national-center.jpg" alt="المركز الوطني" />
        </div>
        <div className="mid">
          <div className="t-ar ar">تقرير إجازة مرضية</div>
          <div className="t-en en">Sick Leave</div>
          <div className="t-en en">Report</div>
          <div className="t-en en">{d.serviceCode}</div>
        </div>
        <div className="side">
          <img src="/assets/paper/facility-default.png" alt="شعار المستشفى" />
        </div>
      </header>

      <div className="intro">
        <div className="en">
          Benefits {d.hospitalEn || "Madina National Hospital"}
          <br />
          That the patient, {d.nameEn}, is the owner of
          <br />
          ID {d.nationalId}
          <br />
          He was granted sick leave for {days} days from {d.leaveFromAr} to{" "}
          {d.leaveToAr} as follows:
        </div>
        <div className="ar">
          يفيد {d.hospitalAr || "مستشفى المدينة الوطني"}
          <br />
          بان المريض {d.nameAr} صاحب
          <br />
          الهوية {d.nationalId}
          <br />
          قد منح إجازة مرضية لـ {days} من الايام من تاريخ {d.leaveFromAr} إلى
          تاريخ {d.leaveToAr} حسب التالي :
        </div>
      </div>

      <div className="grid">
        <MRow head en={<span style={{ fontWeight: 700 }}>Patient&apos;s Information</span>} ar={<span style={{ fontWeight: 700 }}>بيانات المريض</span>} />
        <MRow
          en={<span className="indent">Medical record number: {d.serviceCode}</span>}
          ar={<span className="indent-ar">رقم السجل الطبي : {d.serviceCode}</span>}
        />
        <MRow
          en={<span className="indent">National ID/residence number: {d.nationalId}</span>}
          ar={<span className="indent-ar">رقم الهوية الوطنية / الإقامة : {d.nationalId}</span>}
        />
        <MRow
          en={<span className="indent">Full name: {d.nameEn}</span>}
          ar={<span className="indent-ar">الاسم الكامل : {d.nameAr}</span>}
        />
        <MRow
          en={<span className="indent">Vacation date: {d.issueEn}</span>}
          ar={<span className="indent-ar">تاريخ الاجازة : {d.issueEn}</span>}
        />
        <MRow
          en={<span className="indent">Nationality: {d.nationalityEn}</span>}
          ar={<span className="indent-ar">الجنسية : {d.nationalityAr}</span>}
        />
        <MRow
          en={<span className="indent">Employer : </span>}
          ar={<span className="indent-ar">جهة العمل : {d.employerAr}</span>}
        />
        <MRow
          en={<span className="indent">Date of entry: {d.leaveFromEn}</span>}
          ar={<span className="indent-ar">تاريخ الدخول : {d.leaveFromAr}</span>}
        />
        <MRow
          en={<span className="indent">Exit date: {d.leaveToEn}</span>}
          ar={<span className="indent-ar">تاريخ الخروج : {d.leaveToAr}</span>}
        />

        <MRow
          rule
          head
          en={<span style={{ fontWeight: 700 }}>Recommendation</span>}
          ar={<span style={{ fontWeight: 700 }}>التوصيات</span>}
        />
        <MRow
          en={<span className="indent">He was given sick leave for {days} days</span>}
          ar={<span className="indent-ar">تم منحه إجازة مرضية لمدة {days} أيام</span>}
        />
        <MRow
          en={<span className="indent">From the date: {d.leaveFromAr}</span>}
          ar={<span className="indent-ar">من تاريخ : {d.leaveFromAr}</span>}
        />
        <MRow
          en={<span className="indent">Until the date: {d.leaveToAr}</span>}
          ar={<span className="indent-ar">حتى تاريخ : {d.leaveToAr}</span>}
        />
        <MRow
          en={<span className="indent">See the treating physician before the end of his leave</span>}
          ar={<span className="indent-ar">مراجعة الطبيب المعالج قبل انتهاء إجازته</span>}
        />

        <MRow
          rule
          head
          en={<span style={{ fontWeight: 700 }}>Attending Physician Information</span>}
          ar={<span style={{ fontWeight: 700 }}>بيانات الطبيب المعالج</span>}
        />
        <MRow
          en={<span className="indent">Name: {d.physicianEn}</span>}
          ar={<span className="indent-ar">الاسم : {d.physicianAr}</span>}
        />
        <MRow
          en={<span className="indent">Position: {d.positionEn}</span>}
          ar={<span className="indent-ar">المسمى الوظيفي : {d.positionAr}</span>}
        />
      </div>

      <div className="foot">
        <img src="/assets/pdf/seha-logo.jpg" alt="منصة صحة" />
        <div className="cap ar">منصة الخدمات الصحية</div>
      </div>
    </div>
  );
}
