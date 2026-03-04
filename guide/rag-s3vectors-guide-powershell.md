# RAG S3/S3 Vectors PowerShell 가이드

`Windows PowerShell` 기준으로 로그인부터 `presign -> 업로드 -> 인덱싱 -> 질의`까지 점검하는 스크립트 예시다.

## 1. 사전 준비
- 서비스 기동: `docker compose up -d`
- 테스트 파일 준비: `sample.txt`
- 대상 URL: `http://localhost:3000`

## 2. 변수 설정
```powershell
$BaseUrl = "http://localhost:3000"
$CalendarId = 1
$Question = "문서 핵심 요약해줘"
$SampleFile = "sample.txt"
```

## 3. 로그인 (세션 쿠키 확보)
```powershell
$loginBody = @{
  userid = "user1"
  password = "1234"
} | ConvertTo-Json

$loginRes = Invoke-RestMethod `
  -Method Post `
  -Uri "$BaseUrl/api/auth/login" `
  -ContentType "application/json" `
  -Body $loginBody `
  -SessionVariable WebSession

$loginRes
```

## 4. Presign 요청
```powershell
$presignBody = @{
  fileName = [System.IO.Path]::GetFileName($SampleFile)
  contentType = "text/plain"
  calendarId = $CalendarId
} | ConvertTo-Json

$presignRes = Invoke-RestMethod `
  -Method Post `
  -Uri "$BaseUrl/api/documents/presign" `
  -ContentType "application/json" `
  -WebSession $WebSession `
  -Body $presignBody

$presignRes
```

## 5. Presigned URL로 업로드
```powershell
Invoke-WebRequest `
  -Method Put `
  -Uri $presignRes.uploadUrl `
  -ContentType "text/plain" `
  -InFile $SampleFile
```

## 6. 업로드 완료 등록
```powershell
$docId = [int64]$presignRes.documentId

$completeBody = @{
  title = [System.IO.Path]::GetFileName($SampleFile)
  tags = @("demo", "rag")
} | ConvertTo-Json

$completeRes = Invoke-RestMethod `
  -Method Post `
  -Uri "$BaseUrl/api/documents/$docId/complete" `
  -ContentType "application/json" `
  -WebSession $WebSession `
  -Body $completeBody

$completeRes
```

## 7. 인덱싱 시작
```powershell
$indexRes = Invoke-RestMethod `
  -Method Post `
  -Uri "$BaseUrl/api/documents/$docId/index" `
  -WebSession $WebSession

$indexRes
```

## 8. 인덱싱 상태 조회
```powershell
$statusRes = Invoke-RestMethod `
  -Method Get `
  -Uri "$BaseUrl/api/documents/$docId/status" `
  -WebSession $WebSession

$statusRes
```

`$statusRes.status`가 `READY`인지 확인한다.

## 9. RAG 질의
```powershell
$queryBody = @{
  question = $Question
  calendarId = $CalendarId
  documentIds = @($docId)
  topK = 6
} | ConvertTo-Json

$queryRes = Invoke-RestMethod `
  -Method Post `
  -Uri "$BaseUrl/api/chat/query" `
  -ContentType "application/json" `
  -WebSession $WebSession `
  -Body $queryBody

$queryRes
```

## 10. 결과 확인 포인트
- `$queryRes.answer`에 답변이 존재
- `$queryRes.sources` 배열 존재
- `sources[].chunkKey`, `sources[].preview` 값 존재

## 11. 트러블슈팅
- 401: 로그인 세션 만료/실패, `-WebSession` 전달 확인
- Presign 실패: Spring IAM 권한(`s3:PutObject`) 확인
- Index 실패: Python IAM 권한(`s3:GetObject`, `s3vectors:*`) 확인
- Query 결과 없음: `calendarId`, `documentIds`, metadata filter 조건 확인
