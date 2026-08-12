import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  priority?: boolean;
};

export default function LongreadImage({ src, alt, priority = false }: Props) {
  return (
    <figure className="my-2 md:my-4">
      <Image
        src={src}
        alt={alt}
        width={1200}
        height={900}
        priority={priority}
        className="w-full h-auto rounded-lg"
      />
    </figure>
  );
}
