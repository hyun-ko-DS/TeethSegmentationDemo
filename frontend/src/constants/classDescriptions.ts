export type Lang = "en" | "ko";

export const CLASS_DESCRIPTIONS: Record<Lang, string[]> = {
  en: [
    // 0: Abrasion
    "Worn or notched tooth surface near the gumline, caused by improper brushing technique or the habit of chewing hard foods. Often presents as tooth sensitivity.",
    // 1: Filling
    "A restoration placed after removing decayed tooth structure, using materials such as composite resin or amalgam. Commonly referred to as a \"filled cavity.\"",
    // 2: Crown
    "A prosthesis that fully covers a severely damaged tooth, typically made of gold or porcelain. Commonly referred to as having a crown or cap placed over the tooth.",
    // 3: Caries Class 1
    "Decay originating in the narrow pits and fissures on the occlusal (chewing) surface of molars. The most common form of early-stage dental caries.",
    // 4: Caries Class 2
    "Decay on the proximal (contact) surfaces between adjacent molars. Often detected late due to food accumulation in these hard-to-clean areas.",
    // 5: Caries Class 3
    "Decay on the proximal surface of incisors or canines, with the incisal edge still intact and unaffected.",
    // 6: Caries Class 4
    "Advanced proximal decay on incisors where the incisal edge has fractured or been destroyed by the progression of caries.",
    // 7: Caries Class 5
    "Decay near the gingival margin at the cervical area of teeth, rather than on the occlusal surface. Commonly develops when gum recession exposes root surfaces with age.",
    // 8: Caries Class 6
    "Localized decay affecting only the cusp tips of molars or the incisal edges of anterior teeth.",
  ],
  ko: [
    // 0: Abrasion
    "잘못된 양치질이나 단단한 음식을 씹는 습관으로 인해 치아 겉면이 닳거나, 치아 목 부분이 패여서 시린 증상.",
    // 1: Filling
    "충치를 긁어낸 자리에 레진이나 아말감 같은 재료로 채워 넣은 흔적. 흔히 \"충치 치료해서 때웠다\"고 한 상태.",
    // 2: Crown
    "치아가 많이 상해서 치아 전체를 금이나 도자기로 덮어씌운 보철물. 흔히 \"금니로 씌웠다\"고 한 상태.",
    // 3: Caries Class 1
    "어금니의 씹는 면에 있는 좁은 골(홈)에서 시작된 충치. 가장 흔하게 발견되는 초기 충치 형태.",
    // 4: Caries Class 2
    "어금니와 어금니가 서로 맞닿는 옆면에 생긴 충치. 음식물이 잘 끼는 곳이라 발견이 늦어지는 경우 다수.",
    // 5: Caries Class 3
    "앞니나 송곳니의 옆면에 생긴 충치. 아직 앞니의 끝부분(자르는 날)까지는 상하지 않은 상태.",
    // 6: Caries Class 4
    "앞니 옆면 충치가 더 심해져서, 음식을 끊어 먹는 앞니의 날카로운 끝부분까지 부러지거나 썩은 상태.",
    // 7: Caries Class 5
    "치아의 씹는 면이 아니라, 잇몸과 가까운 치아 뿌리 쪽에 생긴 충치. 나이가 들어 잇몸이 내려갔을 때 자주 발생.",
    // 8: Caries Class 6
    "어금니의 뾰족하게 튀어나온 교두이나 앞니의 절단면 끝부분에만 국소적으로 생긴 충치.",
  ],
};
