interface ErrorScreenProps {
  message: string;
}

export default function ErrorScreen({ message }: ErrorScreenProps) {
  return <div className="flex h-full w-full items-center justify-center">{message}</div>;
}
