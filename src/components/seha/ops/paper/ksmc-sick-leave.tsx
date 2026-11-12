"use client";

/**
 * «تقرير إجازة مرضية» — مدينة الملك سعود الطبية — ported 1:1 from the
 * reference archive (middlewares/paper/ksmcSickLeave.js): letterhead image,
 * bordered centred title, bilingual patient rows, checkbox recommendation
 * list, closing administrative letter, doctor boxes image and the official
 * seal + signature.
 *
 * «KINGDOM OF SAUDA ARABIA» appears as typed in the original header — kept
 * faithful to the source document.
 */

import { box, PAPER_FONT_CSS, usePaperData } from "./paper-shared";
import type { PortalSickLeaveRecord } from "@/lib/seha/ops";

const CSS = `${PAPER_FONT_CSS}
  .ksm { padding: 30px 45px 23px; direction: ltr; }
  .ksm .lh { text-align: center; margin-bottom: 6px; }
  .ksm .lh > img { width: 100%; height: auto; object-fit: contain; display: block; }
  .ksm .title { display: flex; justify-content: center; margin: 4px 0 12px; }
  .ksm .title > span { display: inline-block; border: 1.4px solid #000; padding: 3px 26px;
    font-size: 14.5px; font-weight: 700; line-height: 1.45; text-align: center; }
  .ksm .brow { display: flex; align-items: baseline; gap: 16px; padding: 4px 0; font-size: 13px; font-weight: 700; }
  .ksm .brow .en { flex: 1; text-align: left; font-family: 'SLAmiri', serif; }
  .ksm .brow .ar { flex: 1; text-align: right; }
  .ksm .brow .ar .two { display: inline-block; min-width: 150px; }
  .ksm .reco { margin-top: 10px; border-top: 1.1px solid #000; padding-top: 8px; }
  .ksm .rhead { display: flex; font-size: 13.5px; font-weight: 700; }
  .ksm .rhead .en { flex: 1; text-align: left; font-family: 'SLAmiri', serif; }
  .ksm .rhead .ar { flex: 1; text-align: right; }
  .ksm .ritem { display: flex; align-items: baseline; gap: 10px; padding: 4px 0; font-size: 12.7px; font-weight: 700; }
  .ksm .ritem .en { flex: 1; text-align: left; display: flex; gap: 8px; align-items: baseline; font-family: 'SLAmiri', serif; }
  .ksm .ritem .ar { flex: 1; text-align: right; display: flex; gap: 8px; align-items: baseline; justify-content: flex-end; }
  .ksm .letter { margin-top: 8px; direction: rtl; text-align: right; font-size: 12.6px; font-weight: 700; line-height: 1.85; }
  .ksm .letter .greet { display: flex; justify-content: space-between; }
  .ksm .sig { margin-top: 10px; display: flex; align-items: flex-end; justify-content: space-between; }
  .ksm .sig img { max-height: 84px; max-width: 165px; object-fit: contain; }
  .ksm .docs { margin-top: 8px; border-top: 1.1px solid #000; padding-top: 8px; position: relative; }
  .ksm .docs .drow { display: flex; align-items: baseline; gap: 12px; padding: 5px 0; font-size: 12.6px; font-weight: 700; }
  .ksm .docs .drow .en { flex: 1; text-align: left; display: flex; gap: 40px; font-family: 'SLAmiri', serif; }
  .ksm .docs .drow .ar { flex: 1; text-align: right; }
  .ksm .docs .boxes { position: absolute; left: 44%; top: 4px; max-height: 96px; object-fit: contain; }
  .ksm .note-imp { margin-top: 6px; font-size: 11.6px; font-weight: 700; text-align: right; }
`;

type BRowProps = { en: React.ReactNode; ar: React.ReactNode };

function KsRow({ en, ar }: BRowProps) {
  return (
    <div className="brow">
      <span className="en en">{en}</span>
      <span className="ar ar">{ar}</span>
    </div>
  );
}

type ItemProps = { on: boolean; en: React.ReactNode; ar: React.ReactNode };

function KsItem({ on, en, ar }: ItemProps) {
  return (
    <div className="ritem">
      <span className="en en">
        {box(on)} {en}
      </span>
      <span className="ar ar">
        {ar} {box(on)}
      </span>
    </div>
  );
}

export function KsmcSickLeaveDocument({ data }: { data: PortalSickLeaveRecord }) {
  const d = usePaperData(data);
  const recSick = true;

  return (
    <div className="paper-sheet ksm">
      <style>{CSS}</style>

      <div className="lh">
        <img src="/assets/paper/ksmc-letterhead.png" alt="ترويسة مدينة الملك سعود الطبية" />
      </div>

      <div className="title">
        <span>
          <span className="ar">تقرير إجازة مرضية</span>
          <br />
          <span className="en">SICK LEAVE REPORT</span>
        </span>
      </div>

      <KsRow en={`Patient Name: ${d.nameEn}`} ar={`اسم المريض : ${d.nameAr}`} />
      <KsRow
        en={`Medical Record No: ${d.serviceCode}`}
        ar={
          <>
            <span className="two">الجنس :</span> رقم السجل الطبي : {d.serviceCode}
          </>
        }
      />
      <KsRow en={`Nationality: ${d.nationalityEn}`} ar={`الجنسية: ${d.nationalityAr}`} />
      <KsRow en={`National ID : ${d.nationalId}`} ar={`السجل المدني : ${d.nationalId}`} />
      <KsRow en={`Place Of Work:`} ar={`جهة العمل : ${d.employerAr}`} />
      <KsRow en={`Date Of Visit: ${d.issueEn}`} ar={`تاريخ المراجعة: ${d.issueEn}`} />
      <KsRow en={`Adm.Date: ${d.leaveFromEn}`} ar={`تاريخ الدخول: ${d.leaveFromAr}`} />
      <KsRow en={`Discharge Date: ${d.leaveToEn}`} ar={`تاريخ الخروج: ${d.leaveToAr}`} />

      <div className="reco">
        <div className="rhead">
          <span className="en">Recommendation</span>
          <span className="ar">التوصيات</span>
        </div>
        <div className="rhead" style={{ fontSize: 12.7, paddingTop: 2 }}>
          <span className="en">Following Medical Examination, It Is Recommend:</span>
          <span className="ar">بالكشف الطبي على المريض نوصي :</span>
        </div>

        <KsItem on={recSick} en="Sick Leave……..Day(s)." ar={<>منحه إجازة مرضية لمدة ( {d.leaveDays} ) يوم فقط</>} />
        <KsItem
          on={false}
          en="Starting From…………To………."
          ar={<>ورقما ({d.leaveDays}) يوم /يوماً إلى تاريخ: {d.leaveToAr}</>}
        />
        <KsItem on={false} en="Follow up before end sick leave." ar="مراجعة الطبيب المعالج قبل انتهاء إجازته" />
        <KsItem on={false} en="Referral up to Medical committee for following reason:" ar="إحالته إلى الهيئة الطبية العامة لأحد الأسباب التالية:" />
        <KsItem on={false} en="Approval of sick leave" ar="اعتماد التقرير الطبي ." />
        <KsItem on={false} en="Cannot be treated at this facility." ar="من غير الممكن علاجه في المشفى ." />
        <KsItem on={false} en="Permanent or partial disability." ar="حالته تدل على عجزه الصحي عن العمل بصورة جزئية او قطعية" />
        <KsItem on={false} en="Others:" ar="أخرى :" />
      </div>

      <div className="docs">
        <img className="boxes" src="/assets/paper/ksmc-doctor-boxes.png" alt="" />
        <div className="drow">
          <span className="en">
            <span>Treating physician Name:</span>
            <span>Signature:</span>
          </span>
          <span className="ar">{d.physicianAr} : اسم الطبيب</span>
        </div>
        <div className="drow">
          <span className="en">
            <span>physician Name:</span>
            <span>Signature:</span>
          </span>
          <span className="ar">: اسم الطبيب المعالج</span>
        </div>
      </div>

      <div className="letter ar">
        <div className="greet">
          <span>سعادة/ </span>
          <span>المحترم</span>
        </div>
        <div>السلام عليكم ورحمة الله وبركاته</div>
        <div>إشارة الى مراجعة الموظف لديكم الموضح اسمه اعلاها للكشف</div>
        <div>عليه تجدون بعالية التقرير الصادر بشأنه</div>
        <div className="sig">
          <span>
            <img src="/assets/paper/ksmc-seal.png" alt="الختم الرسمي" />
          </span>
          <span>
            <img src="/assets/paper/ksmc-signature.png" alt="التوقيع" />
          </span>
        </div>
        <div className="note-imp">ملاحظة هامة : لا يعتمد هذا التقرير مالم يحمل الختم الرسمي</div>
      </div>
    </div>
  );
}
