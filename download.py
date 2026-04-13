import time
import random
import zipfile
from pathlib import Path

import gdown

# ── Google Drive ZIP 파일 ID ──────────────────────────────────────
#   key        : 로컬에 저장할 zip 파일 경로
#   file_id    : Google Drive 파일 ID
#   extract_to : 압축 해제 대상 디렉토리
# ──────────────────────────────────────────────────────────────────
ZIP_IDS: dict[str, dict] = {
    "data/images.zip": {
        "file_id": "1sDWNroxPpEX5_fM1XBILooJ9jKH2wBz8",
        "extract_to": "data",
    },
    "data/labels.zip": {
        "file_id": "1h5epXRMRae4gOPJPaz89pjPDGGnYWCM9",
        "extract_to": "data",
    },
    "models/models.zip": {
        "file_id": "1pmsMXzqgMFkB3fTUQ38Dihxs_xyVWP3d",
        "extract_to": "models",
    },
}


# ── 다운로드 ──────────────────────────────────────────────────────

def download_zip(file_id: str, zip_path: Path, max_retries: int = 5) -> bool:
    """Google Drive에서 zip 파일 한 개를 다운로드. 실패 시 지수 백오프 후 재시도.

    Returns:
        True  — 다운로드 성공 (또는 이미 존재)
        False — max_retries 소진 후 실패
    """
    if zip_path.exists() and zip_path.stat().st_size > 0 and zipfile.is_zipfile(zip_path):
        print(f"⏩ 스킵 (이미 존재): {zip_path}")
        return True

    zip_path.parent.mkdir(parents=True, exist_ok=True)

    for attempt in range(1, max_retries + 1):
        try:
            gdown.download(
                id=file_id,
                output=str(zip_path),
                quiet=False,
                use_cookies=False,
                resume=True,
            )
            if zip_path.is_file() and zip_path.stat().st_size > 0:
                if zipfile.is_zipfile(zip_path):
                    return True
                # Drive가 HTML 오류 페이지를 반환한 경우
                print(f"   ⚠️  유효하지 않은 zip 수신 ({attempt}/{max_retries})")
            else:
                print(f"   ⚠️  빈 파일 수신 ({attempt}/{max_retries})")
        except Exception as e:
            print(f"   ⚠️  에러 ({attempt}/{max_retries}): {e}")

        # 손상된 파일 제거 후 재시도
        zip_path.unlink(missing_ok=True)

        if attempt < max_retries:
            wait = min(5 * (2 ** (attempt - 1)), 60) + random.uniform(0, 5)
            print(f"   ⏳ {wait:.1f}s 대기 후 재시도...")
            time.sleep(wait)

    return False


# ── 압축 해제 ─────────────────────────────────────────────────────

def extract_zip(zip_path: Path, extract_to: Path) -> int:
    """zip 파일을 extract_to 디렉토리에 압축 해제.

    - macOS 아티팩트(.DS_Store, __MACOSX) 자동 제외
    - 이미 존재하는 파일은 덮어쓰기

    Returns:
        압축 해제된 파일 수
    """
    def _should_skip(name: str) -> bool:
        parts = Path(name).parts
        return any(p in (".DS_Store", "__MACOSX") or p.startswith("._") for p in parts)

    extract_to.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path, "r") as z:
        members = [m for m in z.namelist() if not _should_skip(m)]
        for member in members:
            z.extract(member, extract_to)
        file_count = sum(1 for m in members if not m.endswith("/"))

    return file_count


# ── 메인 ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    failed: list[str] = []

    for zip_rel, cfg in ZIP_IDS.items():
        file_id    = cfg["file_id"]
        zip_path   = Path(zip_rel)
        extract_to = Path(cfg["extract_to"])

        if not file_id:
            print(f"⏩ 스킵: {zip_rel} — Drive ID 미등록")
            continue

        # 1. 다운로드
        print(f"\n📡 다운로드 중: {zip_rel}")
        ok = download_zip(file_id, zip_path)
        if not ok:
            print(f"❌ 다운로드 실패: {zip_rel}")
            failed.append(zip_rel)
            continue
        print(f"✅ 다운로드 완료: {zip_rel}")

        # 2. 압축 해제
        print(f"📦 압축 해제 중: {zip_path} → {extract_to}/")
        try:
            count = extract_zip(zip_path, extract_to)
            print(f"✅ 압축 해제 완료: {count}개 파일 → {extract_to}/")
        except Exception as e:
            print(f"❌ 압축 해제 실패 ({zip_rel}): {e}")
            failed.append(zip_rel)

    if failed:
        print(f"\n⚠️  실패 목록 ({len(failed)}개):")
        for f in failed:
            print(f"   - {f}")
    else:
        print("\n✨ 모든 다운로드 및 압축 해제 완료!")
