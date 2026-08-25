from .py.multi_lora_loader import MultiLoraLoader
from .py.prompt_segments import PromptSegments
from .py.resolution_switcher import ResolutionSwitcher
from .py.img2img_txt2img_switch import Img2ImgTxt2ImgSwitch
from .py.prompt_extractor import PromptExtractor

NODE_CLASS_MAPPINGS = {
    "MultiLoraLoader": MultiLoraLoader,
    "PromptSegments": PromptSegments,
    "ResolutionSwitcher": ResolutionSwitcher,
    "Img2ImgTxt2ImgSwitch": Img2ImgTxt2ImgSwitch,
    "PromptExtractor": PromptExtractor,
}
NODE_DISPLAY_NAME_MAPPINGS = {
    "MultiLoraLoader": "多 LoRA 加载器",
    "PromptSegments": "提示词段落",
    "ResolutionSwitcher": "分辨率切换器",
    "Img2ImgTxt2ImgSwitch": "图生图 / 文生图 切换",
    "PromptExtractor": "提示词提取器",
}
WEB_DIRECTORY = "js"
