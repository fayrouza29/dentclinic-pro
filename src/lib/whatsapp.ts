import { CABINET } from "@/lib/cabinet"

/** Texte brut pour aperçu / WhatsApp (dentiste → patient). */
export function messageAccesPatientMobile(
  prenom: string,
  email: string,
  motDePasse: string,
): string {
  return `Bonjour ${prenom},

Voici votre accès à votre espace patient :
🔗 Lien : https://dentclinic-pro.vercel.app/patient/login
📧 Email : ${email}
🔑 Mot de passe : ${motDePasse}

Ouvrez le lien sur votre téléphone et connectez-vous pour voir vos rendez-vous et vos soins.

${CABINET.nom}
📞 ${CABINET.telephone}`
}

/** Lien wa.me pour envoyer les identifiants espace patient. */
export function genererLienWhatsAppAccesPatient(
  telephone: string,
  prenom: string,
  email: string,
  motDePasse: string,
): string {
  const numero = telephone.replace(/\D/g, "")
  const message = messageAccesPatientMobile(prenom, email, motDePasse)
  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`
}

export function genererLienWhatsApp(
  nom: string,
  prenom: string,
  telephone: string,
  dateRdv: string,
): string {
  const numero = telephone.replace(/\D/g, "")
  const date = new Date(dateRdv)
  const dateFormatee = date.toLocaleDateString("fr-TN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
  const heureFormatee = date.toLocaleTimeString("fr-TN", {
    hour: "2-digit",
    minute: "2-digit",
  })
  const message = `Bonjour ${prenom} ${nom},\n\nRappel de votre rendez-vous :\n📅 ${dateFormatee}\n⏰ ${heureFormatee}\n\nMerci de confirmer votre présence.\n\n${CABINET.nom}\n📞 ${CABINET.telephone}`
  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`
}
