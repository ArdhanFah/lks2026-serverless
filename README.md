# TokoBaju.id — Frontend
## LKS Komputasi Awan 2026

Frontend statis untuk sistem pemrosesan pesanan serverless TokoBaju.id.

## File

```
src/
├── index.html   ← UI utama (dark industrial theme)
└── app.js       ← Logika: form, API call, pipeline animation
```

## Konfigurasi

Buka `src/app.js` dan ganti nilai `API_URL` di baris paling atas:

```js
const API_URL = "https://XXXX.execute-api.us-east-1.amazonaws.com/prod/orders";
```

Nilai ini didapat dari output Terraform: `api_gateway_url`.

## Cara Deploy ke S3 + CloudFront

Setelah `terraform apply` selesai:

```bash
# 1. Ambil nama bucket dari output Terraform
BUCKET=$(terraform -chdir=../terraform output -raw frontend_s3_bucket)
CDN_ID=$(terraform -chdir=../terraform output -raw cloudfront_distribution_id)

# 2. Upload semua file frontend ke S3
aws s3 sync src/ s3://$BUCKET/ --delete

# 3. Invalidasi cache CloudFront agar perubahan langsung live
aws cloudfront create-invalidation \
  --distribution-id $CDN_ID \
  --paths "/*"

# 4. Akses via URL CloudFront
terraform -chdir=../terraform output cloudfront_url
```

## Cara Deploy ke Amplify (Alternatif)

1. Push folder `src/` ke repository GitHub
2. Di Amplify Console, hubungkan repository
3. Amplify akan auto-deploy setiap kali ada push ke branch `main`

## Fitur UI

- Form pembuatan pesanan (nama, email, items, metode bayar)
- Pipeline tracker real-time (5 tahap: API GW → Lambda → Step Functions → Payment → SNS)
- Status card sukses/gagal dari response API
- Riwayat pesanan sesi ini dengan status update simulasi
- Statistik: total order, sukses, gagal
