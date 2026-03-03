import PublicAuthCard from "../components/PublicAuthCard";

export default function ErrorPage({ appVersion }) {
  return (
    <PublicAuthCard
      title="Error"
      copy="The requested page could not be completed. Use the link below to return to sign-in."
      appVersion={appVersion}
    />
  );
}
