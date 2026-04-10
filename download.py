import gdown
from pathlib import Path

# 1. 모든 모델의 Google Drive ID 통합 관리
DRIVE_IDS = {
    "model_365": {
        "pt": "10b1nx9PUgQWOVVPSRx7m98sJxURfqxhp",
        "onnx": "1xwpTu5knpAI9igwqOIBy373eUi7MlySI",
        "json": "1We0eBkbrG4_SBn5UVnR_smyLRUpryRBr",
        "engine": "13fyssWX7NhWRQXjRv2Y9n4IC01-X2Hdb"
    },
    "model_360": {
        "pt": "1Kj0-T9xiKdRugcHqaef2NpQ3hyNMmzY4",
        "onnx": "1C-RiOOO8Gf7G0M-ff8aJZoJn8LFpFsWU",
        "json": "1oOUOEEpgQulWgIEFS9aGtqoFfX2EeXXZ",
        "engine": "1UlKvPplyNb6CYoDRvvyhyvV5C7nk93_A"
    },
    "model_357": {
        "pt": "1rIHJakSahRRVOO1qfZjlAVxEUhO-yFP2",
        "onnx": "1YURCE37EI0PP1xc8_jcewHseyjI4JAf1",
        "json": "1_EjLeM0JaGBrrFAmnYyRt5pBrOnLMhT5",
        "engine": "1dgbgJH5_8uf3h0ARhs1PGOT-NYTGDMTy"
    },
    "model_355": {
        "pt": "1f3AI8eawYGetpj_KOV9ywrC4QZQjFj50",
        "onnx": "1eObLMQ9tbLwSl2g5NA1lmIwlS5wHNOhO",
        "json": "1PsJrDJ8wqTsMPlz0EJt0WA8pCt5LvIf8",
        "engine": "1J9YzgeeUL2UVuARTkp9dTbM_McnsnxWu"
    },
}

IMAGE_IDS = {
    "images": {
        "valid": "1UGFL_Qc_bPwReqNwgCvnoKTkVUMoM8tZ",
        "test": "13T0ffhMETP8dSNIWh_FyLKJzKDsDInsV"
    },
    "labels": {
        "valid": "1tKfGmuUu1kuhx4xGZ_GUgW4IVIzXRWon"
    },
}


def download_all_resources():
    """등록된 모든 모델과 모든 파일 형식을 순차적으로 다운로드"""
    file_types = ["pt", "onnx", "json", "engine"]

    print("🚀 모든 모델 리소스 다운로드를 시작합니다...")

    for model_name, ids in DRIVE_IDS.items():
        suffix = model_name.rsplit("_", 1)[-1]
        model_dir = Path("models") / model_name
        model_dir.mkdir(parents=True, exist_ok=True)

        print(f"\n📂 [{model_name}] 처리 중...")

        for f_type in file_types:
            file_id = ids.get(f_type)
            if not file_id:
                continue

            # 파일명 규칙 설정
            if f_type == "json":
                file_name = f"config_{suffix}.json"
            else:
                file_name = f"best_{suffix}.{f_type}"

            target_path = model_dir / file_name

            # 이미 파일이 존재하는지 확인 (중복 다운로드 방지)
            if target_path.exists():
                print(f"⏩ 스킵: {target_path} 가 이미 존재합니다.")
                continue

            print(f"📡 다운로드 중: {file_name}")
            try:
                gdown.download(id=file_id, output=str(target_path), quiet=True)
                if target_path.is_file():
                    print(f"✅ 완료: {target_path}")
                else:
                    print(f"❌ 에러: {file_name} 다운로드 확인 실패")
            except Exception as e:
                print(f"❌ 에러 발생 ({file_name}): {e}")

    print("\n✨ 모든 작업이 완료되었습니다!")


def download_data():
    """images/labels 데이터를 data/ 폴더에 다운로드"""
    print("🚀 데이터 다운로드를 시작합니다...")

    for category, splits in IMAGE_IDS.items():
        for split, folder_id in splits.items():
            target_dir = Path("data") / category / split
            target_dir.mkdir(parents=True, exist_ok=True)

            if any(target_dir.iterdir()):
                print(f"⏩ 스킵: {target_dir} 에 파일이 이미 존재합니다.")
                continue

            print(f"📡 다운로드 중: data/{category}/{split}")
            try:
                gdown.download_folder(id=folder_id, output=str(target_dir), quiet=True)
                count = sum(1 for _ in target_dir.iterdir())
                print(f"✅ 완료: {target_dir} ({count}개 파일)")
            except Exception as e:
                print(f"❌ 에러 발생 (data/{category}/{split}): {e}")

    print("\n✨ 데이터 다운로드가 완료되었습니다!")


if __name__ == "__main__":
    download_all_resources()
    download_data()
