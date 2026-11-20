// ─────────────────────────────────────────────────────────────
// 설정 파일: 고칠 곳은 여기 한 군데입니다.
// ─────────────────────────────────────────────────────────────
window.STUDY_CONFIG = {
  // Supabase 프로젝트 화면의 Connect 버튼(또는 Settings > API Keys)에서 복사
  SUPABASE_URL: "https://fhaayhhudugoayyobnrg.supabase.co",   // 예: "https://abcdefgh.supabase.co"
  SUPABASE_KEY: "sb_publishable_wmU_l5XQentrlH25K_OxUQ_sCdQIGH8",   // Publishable key ("sb_publishable_..."로 시작). Secret key는 절대 넣지 않는다.

  MODE: "pilot",      // "pilot" = 파일럿, "main" = 본조사
  LANG: "en",

  REWARD: "",         // 안내문에 들어갈 보상 금액. 예: "£1.50"  (비워 두면 "[amount]"로 보임)

  // Prolific에서 스터디를 만들 때 발급되는 주소. 비워 두면 Prolific으로 이동하지 않는다.
  PROLIFIC_COMPLETE_URL: "https://app.prolific.com/submissions/complete?cc=CEX2WTH1",
  PROLIFIC_SCREENOUT_URL: "https://app.prolific.com/submissions/complete?cc=CEIB9EXT",
  PROLIFIC_NOCONSENT_URL: "https://app.prolific.com/submissions/complete?cc=C1NCQS04"
};
