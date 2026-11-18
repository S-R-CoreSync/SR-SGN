import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import MembershipForm from "@/components/membership/MembershipForm";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'membership' });
  return {
    metadataBase: new URL("https://sy-nl.org"),
    title: t('title'),
    description: t('subtitle') + " - Aanmeldingsformulier Syrische Gemeenschap in Nederland",
  };
}

export default async function JoinPage({ params }: Props) {
  const { locale } = await params;

  // من سجّل الدخول بفيسبوك/جوجل وصار عنده عضوية: لا داعي للنموذج
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const member = await prisma.member.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (member) redirect(`/${locale}/membership-card`);
    }
  } catch (err) {
    // خطأ قاعدة البيانات يجب ألا يمنع عرض نموذج الانتساب
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error("[Join] member lookup failed:", err);
  }

  return <MembershipForm />;
}
