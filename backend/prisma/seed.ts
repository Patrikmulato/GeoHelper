import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/index.js';
import { geoguessrCountries } from '../src/data/geoguessr-countries.js';

const usefulMapCategorySeed: ReadonlyArray<{ slug: string; label: string }> = [
  { slug: 'general', label: 'General' },
  { slug: 'license-plates', label: 'License Plates' },
  { slug: 'road-signs', label: 'Road Signs' },
  { slug: 'road-lines', label: 'Road Lines' },
  { slug: 'bollards', label: 'Bollards' },
  { slug: 'meta-clues', label: 'Meta Clues' },
  { slug: 'us', label: 'US' },
  { slug: 'japan', label: 'Japan' },
  { slug: 'australia', label: 'Australia' },
  { slug: 'europe', label: 'Europe' },
  { slug: 'brazil', label: 'Brazil' },
  { slug: 'vietnam', label: 'Vietnam' },
];

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main() {
  for (const name of geoguessrCountries) {
    await prisma.country.upsert({
      where: { name },
      update: { code: name },
      create: { name, code: name },
    });
  }

  for (const category of usefulMapCategorySeed) {
    await prisma.usefulMapCategory.upsert({
      where: { slug: category.slug },
      update: { label: category.label },
      create: {
        slug: category.slug,
        label: category.label,
      },
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
