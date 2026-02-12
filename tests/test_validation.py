import pandas as pd
from app.validation import validate_dataframe, load_rules

def test_validate_basic():
    df = pd.DataFrame({
        'name': ['Alice', 'Bob', None],
        'age': [30, -5, 25],
        'email': ['a@example.com', 'invalid', 'c@example.com']
    })
    rules = load_rules('ui/validation_rules/basic.yaml')
    report = validate_dataframe(df, rules)
    assert 'errors' in report
    assert report['summary']['error_count'] >= 1
