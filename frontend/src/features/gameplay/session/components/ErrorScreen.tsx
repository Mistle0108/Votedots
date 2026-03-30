interface ErrorScreenProps {
  message: string;
}

export default function ErrorScreen({ message }: ErrorScreenProps) {
  return (
    <div className="flex h-screen items-center justify-center">{message}</div>
  );
}
