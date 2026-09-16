import type { Metadata } from "next";
import { InnerPage } from "@/app/components/inner-page";
import CareerApplicationForm from "@/app/components/career-application-form";
export const metadata:Metadata={title:"Apply for a role",description:"Submit an application for an open role at AKELUWA SH.",robots:{index:false,follow:true}};
export default function CareerApplyPage(){return <InnerPage eyebrow="CAREERS / APPLICATION" title={<>Show us how you <em>think and build.</em></>} intro="Share the essentials and attach your resume. Your application goes directly to the AKELUWA SH administration team."><CareerApplicationForm/></InnerPage>}
