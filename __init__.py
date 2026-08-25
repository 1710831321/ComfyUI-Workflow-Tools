from .py.multi_lora_loader import MultiLoraLoader
from .py.prompt_segments import PromptSegments
from .py.resolution_switcher import ResolutionSwitcher

NODE_CLASS_MAPPINGS = {
    "MultiLoraLoader": MultiLoraLoader,
    "PromptSegments": PromptSegments,
    "ResolutionSwitcher": ResolutionSwitcher,
}
NODE_DISPLAY_NAME_MAPPINGS = {
    "MultiLoraLoader": "多 LoRA 加载器",
    "PromptSegments": "提示词段落",
    "ResolutionSwitcher": "分辨率切换器",
}
WEB_DIRECTORY = "js"
