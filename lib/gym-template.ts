export const GYM_GIRL_TEMPLATE_TITLE =
  "Gym girl aesthetic Pinterest image template";

export const GYM_GIRL_TEMPLATE_DESCRIPTION =
  "Reusable adult, fitness-focused, Pinterest-safe image prompt template for gym girl aesthetic variations.";

export const GYM_GIRL_TEMPLATE = `{
  "subject": {
    "gender": "{{subject_gender: keep clearly adult; default to woman if appropriate}}",
    "age_range": "{{age_range: clearly adult age range, never teen/underage-coded}}",
    "body": {
      "build": "{{body_build: athletic fitness build without sexualized framing}}",
      "highlights": [
        "{{body_highlight_1: strength or posture detail such as shoulders, back, core, or legs}}",
        "{{body_highlight_2: another fitness-focused detail}}",
        "{{body_highlight_3: another non-explicit silhouette or strength detail}}"
      ]
    },
    "skin": "{{skin_detail: realistic natural skin texture and safe beauty detail}}",
    "ethnicity": "{{ethnicity: optional broad/ambiguous heritage descriptor, avoid stereotypes}}"
  },
  "clothing": "{{clothing: describe modest gym-fit clothing, colors, and silhouette; avoid lingerie or nudity}}",
  "accessories": "{{accessories: fitness/lifestyle accessories such as headphones, smartwatch, water bottle, phone, towel}}",
  "action": "{{action: describe a gym, training, mirror selfie, recovery, or routine moment; keep non-explicit}}",
  "background": "{{background: gym/studio environment, visible equipment, clean Pinterest-friendly composition}}",
  "lighting": {
    "type": "{{lighting_type: flash, daylight, studio, golden hour, or mixed lighting}}",
    "direction": "{{lighting_direction: where the light comes from}}",
    "face_effect": "{{face_effect: how light affects the face; keep flattering and realistic}}",
    "background_effect": "{{background_effect: shadows, falloff, depth, or environmental mood}}",
    "highlights": "{{highlights: tasteful highlights on fabric, skin texture, or athletic form}}"
  },
  "quality": "{{quality: camera/source quality such as iPhone RAW, editorial photography, or high-detail realistic render}}",
  "safety": "clearly adult, fitness-focused, non-explicit, Pinterest-safe, no nudity, no lingerie framing, no fetish language, no underage ambiguity"
}`;
