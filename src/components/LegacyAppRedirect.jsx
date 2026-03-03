import { Navigate, useParams } from "react-router-dom";

export default function LegacyAppRedirect({ to }) {
  const params = useParams();
  let target = to;

  Object.entries(params).forEach(([key, value]) => {
    target = target.replace(`:${key}`, value);
  });

  return <Navigate to={target} replace />;
}
