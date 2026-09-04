import os
import sys

# Automatically include virtual environment site-packages if running with global Python
venv_site_packages = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.venv/Lib/site-packages"))
if os.path.exists(venv_site_packages) and venv_site_packages not in sys.path:
    sys.path.insert(0, venv_site_packages)

import pickle

class SafeUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        try:
            return super().find_class(module, name)
        except (ModuleNotFoundError, AttributeError):
            class DummyClass:
                def __init__(self, *args, **kwargs):
                    pass
                def __setstate__(self, state):
                    if isinstance(state, dict):
                        self.__dict__.update(state)
                    elif isinstance(state, tuple):
                        for item in state:
                            if isinstance(item, dict):
                                self.__dict__.update(item)
                def __getitem__(self, item):
                    return getattr(self, item, None)
                def __setitem__(self, key, value):
                    setattr(self, key, value)
            DummyClass.__module__ = module
            DummyClass.__name__ = name
            return DummyClass

def safe_load_pickle(filepath):
    with open(filepath, "rb") as f:
        try:
            return pickle.load(f)
        except Exception:
            f.seek(0)
            return SafeUnpickler(f).load()

def evaluate_all_models():
    models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../app/ml/models"))
    if not os.path.exists(models_dir):
        print(f"Models directory not found at: {models_dir}")
        return

    print("=" * 65)
    print(f"{'MODEL NAME':<25} | {'METRIC':<15} | {'VALUE':<15}")
    print("=" * 65)

    for filename in sorted(os.listdir(models_dir)):
        if filename.endswith(".pkl"):
            filepath = os.path.join(models_dir, filename)
            try:
                data = safe_load_pickle(filepath)
                metrics = data.get("metrics", {})
                version = data.get("version", "v1")
                name = filename.replace(".pkl", "")
                
                print(f"Model: {name} (Version: {version})")
                if isinstance(metrics, dict):
                    for k, v in metrics.items():
                        try:
                            formatted_val = f"{float(v):.4f}" if isinstance(v, (int, float)) or hasattr(v, '__float__') else str(v)
                        except Exception:
                            formatted_val = str(v)
                        print(f"  - {k:<20}: {formatted_val}")
                else:
                    print(f"  - Metrics: {metrics}")
                print("-" * 65)
            except Exception as e:
                print(f"Error reading {filename}: {e}")

if __name__ == "__main__":
    evaluate_all_models()
